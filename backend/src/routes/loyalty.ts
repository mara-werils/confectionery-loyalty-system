import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { authenticate, requirePartner } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { mintLoyaltyTokens } from '../controllers/mint';
import { transferLoyaltyTokens } from '../controllers/transfer';
import { recordTransactionOnChain } from '../services/revenue.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /loyalty/balance:
 *   get:
 *     summary: Get current loyalty points balance
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current balance
 */
router.get(
  '/balance',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loyaltyPoints = await prisma.loyaltyPoints.findUnique({
        where: { partnerId: req.user!.id },
      });

      if (!loyaltyPoints) {
        throw new AppError('Loyalty points not found', 404, 'NOT_FOUND');
      }

      return successResponse(res, {
        balance: loyaltyPoints.balance.toString(),
        lifetimeEarned: loyaltyPoints.lifetimeEarned.toString(),
        lifetimeRedeemed: loyaltyPoints.lifetimeRedeemed.toString(),
        lastUpdated: loyaltyPoints.updatedAt,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /loyalty/config:
 *   get:
 *     summary: Get loyalty program configuration
 *     tags: [Loyalty]
 *     responses:
 *       200:
 *         description: Config parameters
 */
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cashbackSetting = await prisma.systemSetting.findUnique({
      where: { key: 'cashback_rate' },
    });
    const cashbackRate = cashbackSetting ? parseFloat(cashbackSetting.value) : 0.10;

    const tierSettings = {
      BRONZE: { threshold: 0, cashback: 0.10 },
      SILVER: { threshold: 5000, cashback: 0.12 },
      GOLD: { threshold: 20000, cashback: 0.15 },
    };

    return successResponse(res, { cashbackRate, tiers: tierSettings });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /loyalty/history:
 *   get:
 *     summary: Get loyalty points history
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PURCHASE, BONUS, REFERRAL, PROMOTION]
 *     responses:
 *       200:
 *         description: Points history
 */
const historyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['PURCHASE', 'BONUS', 'REFERRAL', 'PROMOTION']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

router.get(
  '/history',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = historyQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const where = {
        partnerId: req.user!.id,
        ...(query.type && { type: query.type }),
        ...(query.from && query.to && {
          createdAt: {
            gte: query.from,
            lte: query.to,
          },
        }),
      };

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transaction.count({ where }),
      ]);

      const formattedTransactions = transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toString(),
        pointsEarned: t.pointsEarned.toString(),
        type: t.type,
        description: t.description,
        txHash: t.txHash,
        createdAt: t.createdAt,
      }));

      return paginatedResponse(res, formattedTransactions, query.page, query.limit, total);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /loyalty/redeem:
 *   post:
 *     summary: Redeem loyalty points for a reward
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardId
 *             properties:
 *               rewardId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Redemption successful
 *       400:
 *         description: Insufficient points or invalid reward
 */
const redeemSchema = z.object({
  rewardId: z.string(),
});

router.post(
  '/redeem',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rewardId } = redeemSchema.parse(req.body);
      const partnerId = req.user!.id;

      // Get reward and loyalty points
      const [reward, loyaltyPoints] = await Promise.all([
        prisma.reward.findUnique({ where: { id: rewardId } }),
        prisma.loyaltyPoints.findUnique({ where: { partnerId } }),
      ]);

      if (!reward) {
        throw new AppError('Reward not found', 404, 'REWARD_NOT_FOUND');
      }

      if (!reward.isActive) {
        throw new AppError('Reward is not available', 400, 'REWARD_INACTIVE');
      }

      if (reward.available <= 0) {
        throw new AppError('Reward is out of stock', 400, 'REWARD_OUT_OF_STOCK');
      }

      if (!loyaltyPoints) {
        throw new AppError('Loyalty points not found', 404, 'POINTS_NOT_FOUND');
      }

      if (loyaltyPoints.balance < reward.pointsRequired) {
        throw new AppError('Insufficient points', 400, 'INSUFFICIENT_POINTS');
      }

      // Process redemption in a transaction
      const [updatedPoints, claim] = await prisma.$transaction([
        // Deduct points
        prisma.loyaltyPoints.update({
          where: { partnerId },
          data: {
            balance: { decrement: reward.pointsRequired },
            lifetimeRedeemed: { increment: reward.pointsRequired },
          },
        }),
        // Create claim
        prisma.claimedReward.create({
          data: {
            partnerId,
            rewardId,
            pointsSpent: reward.pointsRequired,
            status: 'PENDING',
          },
        }),
        // Update reward availability
        prisma.reward.update({
          where: { id: rewardId },
          data: {
            available: { decrement: 1 },
            totalClaimed: { increment: 1 },
          },
        }),
      ]);

      // Emit real-time update
      io.to(`partner:${partnerId}`).emit('balance:updated', {
        balance: updatedPoints.balance.toString(),
        lifetimeRedeemed: updatedPoints.lifetimeRedeemed.toString(),
      });

      io.to(`partner:${partnerId}`).emit('points:redeemed', {
        partnerId,
        pointsSpent: reward.pointsRequired.toString(),
        newBalance: updatedPoints.balance.toString(),
        rewardId: reward.id,
        rewardTitle: reward.title,
      });

      io.to(`partner:${partnerId}`).emit('reward:claimed', {
        claimId: claim.id,
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsSpent: reward.pointsRequired.toString(),
      });

      return successResponse(
        res,
        {
          claim: {
            id: claim.id,
            rewardId: claim.rewardId,
            pointsSpent: claim.pointsSpent.toString(),
            status: claim.status,
          },
          newBalance: updatedPoints.balance.toString(),
        },
        'Redemption request submitted'
      );
    } catch (error) {
      return next(error);
    }
  }
);

// ─── Simulate Purchase (FR1 Demo) ────────────────────────────────────────────

/**
 * @swagger
 * /loyalty/simulate-purchase:
 *   post:
 *     summary: Simulate a customer purchase and issue SWEET loyalty tokens (Demo - FR1)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *               - customerWallet
 *               - amount
 *             properties:
 *               partnerId:
 *                 type: string
 *               customerWallet:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Purchase amount in KZT
 *               items:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Purchase simulated, SWEET tokens issued
 */
const simulatePurchaseSchema = z.object({
  partnerId: z.string(),
  customerWallet: z.string().min(1),
  amount: z.number().positive(),
  items: z.array(z.string()).optional(),
});

const TIER_MULTIPLIERS = {
  BRONZE: 1.0,
  SILVER: 1.5,
  GOLD: 2.0,
} as const;

router.post(
  '/simulate-purchase',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = simulatePurchaseSchema.parse(req.body);

      // Look up the partner to get their tier
      const partner = await prisma.partner.findUnique({
        where: { id: data.partnerId },
        include: { loyaltyPoints: true },
      });

      if (!partner) {
        throw new AppError('Partner not found', 404, 'PARTNER_NOT_FOUND');
      }

      if (partner.status !== 'ACTIVE') {
        throw new AppError('Partner account is not active', 400, 'ACCOUNT_NOT_ACTIVE');
      }

      // Calculate SWEET points: 1 KZT = 1 point * tier multiplier
      const multiplier = TIER_MULTIPLIERS[partner.tier as keyof typeof TIER_MULTIPLIERS] ?? 1.0;
      const basePoints = Math.floor(data.amount);
      const pointsEarned = Math.floor(basePoints * multiplier);

      // Generate a fake but realistic-looking tx hash for demo purposes
      const fakeTxHash =
        '0x' +
        Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');

      // Build description from items list (or fallback)
      const itemsSummary =
        data.items && data.items.length > 0
          ? data.items.join(', ')
          : 'Confectionery purchase';
      const description = `${itemsSummary} — ₸${data.amount.toLocaleString('ru-KZ')}`;

      // Create transaction record & update LoyaltyPoints atomically
      const [transaction, updatedPoints] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            partnerId: data.partnerId,
            amount: BigInt(Math.round(data.amount * 100)),
            pointsEarned: BigInt(pointsEarned),
            type: 'PURCHASE',
            description,
            txHash: fakeTxHash,
          },
        }),
        prisma.loyaltyPoints.update({
          where: { partnerId: data.partnerId },
          data: {
            balance: { increment: BigInt(pointsEarned) },
            lifetimeEarned: { increment: BigInt(pointsEarned) },
          },
        }),
      ]);

      // ── Real-time Socket.IO events ──────────────────────────────────────────

      const activityPayload = {
        type: 'purchase',
        message: `+${pointsEarned} SWEET earned at ${partner.companyName}`,
        amount: pointsEarned,
        timestamp: new Date().toISOString(),
      };

      // 1. Broadcast to all connected clients (public live-feed)
      io.emit('activity:new', activityPayload);

      // 2. Notify the partner's own room (balance update)
      io.to(`partner:${data.partnerId}`).emit('transaction:created', {
        id: transaction.id,
        amount: transaction.amount.toString(),
        pointsEarned: transaction.pointsEarned.toString(),
        type: transaction.type,
        description,
        txHash: fakeTxHash,
      });

      io.to(`partner:${data.partnerId}`).emit('balance:updated', {
        balance: updatedPoints.balance.toString(),
        lifetimeEarned: updatedPoints.lifetimeEarned.toString(),
      });

      // 3. Notify the customer's wallet room (real-time notification for them)
      io.to(`wallet:${data.customerWallet}`).emit('purchase:awarded', {
        partnerName: partner.companyName,
        pointsEarned,
        amount: data.amount,
        items: data.items ?? [],
        txHash: fakeTxHash,
        timestamp: new Date().toISOString(),
      });

      // 4. Fire-and-forget: record commission in RevenueDistribution on-chain
      recordTransactionOnChain(partner.walletAddress, data.amount, partner.tier).catch((err) =>
        logger.warn('[Revenue] fire-and-forget recordTransaction failed:', err)
      );

      return successResponse(
        res,
        {
          transaction: {
            id: transaction.id,
            amount: transaction.amount.toString(),
            pointsEarned: pointsEarned.toString(),
            type: transaction.type,
            description,
            txHash: fakeTxHash,
            createdAt: transaction.createdAt,
          },
          partner: {
            id: partner.id,
            companyName: partner.companyName,
            tier: partner.tier,
          },
          customerWallet: data.customerWallet,
          tierMultiplier: multiplier,
          newBalance: updatedPoints.balance.toString(),
        },
        `Purchase simulated: ${pointsEarned} SWEET issued to ${data.customerWallet}`,
        201
      );
    } catch (error) {
      return next(error);
    }
  }
);

// ─── Mint ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /loyalty/mint:
 *   post:
 *     summary: Mint new tokens to a user's wallet (Demo functionality)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetWallet
 *               - amount
 *             properties:
 *               targetWallet:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Minting initiated
 */
router.post('/mint', mintLoyaltyTokens);

/**
 * @swagger
 * /loyalty/transfer:
 *   post:
 *     summary: Simulate a POS payment by transferring SWEET tokens to a customer (Demo functionality)
 *     tags: [Loyalty]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientWallet
 *               - amount
 *             properties:
 *               clientWallet:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Transfer initiated
 */
router.post('/transfer', transferLoyaltyTokens);

export default router;












