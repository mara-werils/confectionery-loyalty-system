import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { authenticate, requirePartner } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';

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
      next(error);
    }
  }
);

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
      next(error);
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
      next(error);
    }
  }
);

export default router;




