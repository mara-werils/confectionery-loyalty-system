import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

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

    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
    if (!loyaltyPoints || loyaltyPoints.balance < reward.pointsRequired) {
      throw new AppError('Insufficient SWEET balance', 400, 'INSUFFICIENT_BALANCE');
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

    return successResponse(res, {
      code: coupon.code,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsRequired.toString(),
      expiresAt: coupon.expiresAt.toISOString(),
      status: coupon.status,
    }, 'Coupon issued successfully', 201);
  } catch (error) {
    return next(error);
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

    const updated = await prisma.coupon.update({
      where: { code },
      data: { status: 'REDEEMED', redeemedAt: new Date() },
    });

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
