import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/auditLog';
import { cache } from '../services/redis';

const router = Router();

const SWEET_JETTON_ADDRESS = '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c';
const COUPON_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * Sync on-chain SWEET balance into DB when DB shows 0 / insufficient.
 * Returns the updated balance (or 0n on failure).
 */
async function syncBalanceFromChain(partnerId: string, walletAddress: string): Promise<bigint> {
  try {
    const res = await fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}/jettons`);
    if (!res.ok) return 0n;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const sweet = data.balances?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => b.jetton?.address?.toLowerCase() === SWEET_JETTON_ADDRESS
    );
    if (!sweet) return 0n;
    const decimals: number = sweet.jetton?.decimals ?? 9;
    const onChainBalance = BigInt(sweet.balance) / BigInt(10 ** decimals);
    await prisma.loyaltyPoints.upsert({
      where: { partnerId },
      update: { balance: onChainBalance },
      create: { partnerId, balance: onChainBalance, lifetimeEarned: onChainBalance },
    });
    return onChainBalance;
  } catch {
    return 0n;
  }
}

function generateCouponCode(): string {
  return 'SWT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

const createSchema = z.object({
  rewardId: z.string().min(1),
});

/**
 * POST /coupons — Issue a real coupon after reward redemption
 * Deducts points, creates coupon record with 30-day expiry
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.partner!.id;
    const { rewardId } = createSchema.parse(req.body);

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) {
      throw new AppError('Reward not found or inactive', 404, 'REWARD_NOT_FOUND');
    }

    let loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
    if (!loyaltyPoints || loyaltyPoints.balance < reward.pointsRequired) {
      // DB balance may be stale — try syncing from on-chain before rejecting
      const chainBalance = await syncBalanceFromChain(partnerId, req.partner!.walletAddress);
      if (chainBalance < reward.pointsRequired) {
        throw new AppError('Insufficient SWEET balance', 400, 'INSUFFICIENT_BALANCE');
      }
      loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
      if (!loyaltyPoints || loyaltyPoints.balance < reward.pointsRequired) {
        throw new AppError('Insufficient SWEET balance', 400, 'INSUFFICIENT_BALANCE');
      }
    }

    // Generate unique code
    let code = generateCouponCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.coupon.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCouponCode();
      attempts++;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [coupon] = await prisma.$transaction([
      prisma.coupon.create({
        data: {
          code,
          partnerId,
          rewardId,
          pointsSpent: reward.pointsRequired,
          rewardTitle: reward.title,
          expiresAt,
          status: 'ACTIVE',
        },
      }),
      prisma.loyaltyPoints.update({
        where: { partnerId },
        data: {
          balance: { decrement: reward.pointsRequired },
          lifetimeRedeemed: { increment: reward.pointsRequired },
        },
      }),
      prisma.reward.update({
        where: { id: rewardId },
        data: { totalClaimed: { increment: 1 } },
      }),
    ]);

    await logAction({
      actorId: partnerId,
      actorType: 'partner',
      action: 'ISSUE_COUPON',
      entityType: 'coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code, rewardId, pointsSpent: reward.pointsRequired.toString() },
    });

    // Cache coupon so verify endpoint can find it instantly
    await cache.set(`coupon:${coupon.code}`, JSON.stringify({
      code: coupon.code,
      rewardTitle: reward.title,
      rewardCategory: reward.category,
      pointsSpent: reward.pointsRequired.toString(),
      expiresAt: coupon.expiresAt.toISOString(),
      status: 'ACTIVE',
      issuedTo: req.partner!.companyName,
    }), COUPON_CACHE_TTL);

    const daysLeft = Math.max(0, Math.ceil((coupon.expiresAt.getTime() - Date.now()) / 86400000));

    return successResponse(res, {
      code: coupon.code,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsRequired.toString(),
      expiresAt: coupon.expiresAt.toISOString(),
      daysLeft,
      status: coupon.status,
    }, 'Coupon issued successfully', 201);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /coupons/verify/:code — Look up coupon info without redeeming (for business POS verification)
 */
router.get('/verify/:code', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    // Check Redis first — avoids a DB round-trip for recently issued coupons
    const cachedRaw = await cache.get(`coupon:${code}`);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const isValid = cached.status === 'ACTIVE' && new Date(cached.expiresAt) > new Date();
      return successResponse(res, { ...cached, isValid });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        reward: { select: { title: true, category: true, description: true } },
        partner: { select: { companyName: true } },
      },
    });

    if (!coupon) throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');

    const isValid = coupon.status === 'ACTIVE' && coupon.expiresAt > new Date();

    // Backfill cache for coupons that pre-date Redis integration
    await cache.set(`coupon:${code}`, JSON.stringify({
      code: coupon.code,
      rewardTitle: coupon.reward?.title || coupon.rewardTitle,
      rewardCategory: coupon.reward?.category,
      rewardDescription: coupon.reward?.description,
      pointsSpent: coupon.pointsSpent.toString(),
      expiresAt: coupon.expiresAt.toISOString(),
      status: coupon.status,
      issuedTo: coupon.partner?.companyName,
      redeemedAt: coupon.redeemedAt?.toISOString() || null,
    }), COUPON_CACHE_TTL);

    return successResponse(res, {
      code: coupon.code,
      status: coupon.status,
      rewardTitle: coupon.reward?.title || coupon.rewardTitle,
      rewardCategory: coupon.reward?.category,
      rewardDescription: coupon.reward?.description,
      issuedTo: coupon.partner?.companyName,
      pointsSpent: coupon.pointsSpent.toString(),
      expiresAt: coupon.expiresAt.toISOString(),
      redeemedAt: coupon.redeemedAt?.toISOString() || null,
      createdAt: coupon.createdAt.toISOString(),
      isValid,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /coupons — List my active coupons
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.partner!.id;

    // Auto-expire old coupons
    await prisma.coupon.updateMany({
      where: { partnerId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    const coupons = await prisma.coupon.findMany({
      where: { partnerId },
      include: { reward: { select: { title: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse(res, coupons.map((c) => ({
      id: c.id,
      code: c.code,
      rewardTitle: c.reward?.title || c.rewardTitle,
      category: c.reward?.category,
      pointsSpent: c.pointsSpent.toString(),
      status: c.status,
      expiresAt: c.expiresAt.toISOString(),
      redeemedAt: c.redeemedAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
      daysLeft: c.status === 'ACTIVE'
        ? Math.max(0, Math.ceil((c.expiresAt.getTime() - Date.now()) / 86400000))
        : 0,
    })));
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /coupons/:code/redeem — Mark coupon as redeemed (called by partner at POS)
 */
router.post('/:code/redeem', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    if (coupon.status === 'REDEEMED') throw new AppError('Coupon already redeemed', 400, 'ALREADY_REDEEMED');
    if (coupon.status === 'EXPIRED') throw new AppError('Coupon has expired', 400, 'COUPON_EXPIRED');
    if (coupon.expiresAt < new Date()) throw new AppError('Coupon has expired', 400, 'COUPON_EXPIRED');

    const redeemedAt = new Date();
    const updated = await prisma.coupon.update({
      where: { code },
      data: { status: 'REDEEMED', redeemedAt },
    });

    // Update cache so verify endpoint immediately returns REDEEMED status
    const existingCache = await cache.get(`coupon:${code}`);
    if (existingCache) {
      const parsed = JSON.parse(existingCache);
      await cache.set(`coupon:${code}`, JSON.stringify({
        ...parsed,
        status: 'REDEEMED',
        redeemedAt: redeemedAt.toISOString(),
      }), COUPON_CACHE_TTL);
    }

    return successResponse(res, {
      code: updated.code,
      rewardTitle: updated.rewardTitle,
      redeemedAt: updated.redeemedAt?.toISOString(),
    }, 'Coupon redeemed successfully');
  } catch (error) {
    return next(error);
  }
});

export default router;
