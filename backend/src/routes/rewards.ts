import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /rewards:
 *   get:
 *     summary: Get rewards catalog
 *     tags: [Rewards]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [DISCOUNT, PRODUCT, CASHBACK, SPECIAL]
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Rewards catalog
 */
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.enum(['DISCOUNT', 'PRODUCT', 'CASHBACK', 'SPECIAL']).optional(),
  available: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
});

router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where = {
      ...(query.category && { category: query.category }),
      ...(query.available !== undefined && {
        available: query.available ? { gt: 0 } : { equals: 0 },
      }),
      // Only show active rewards to non-admins
      ...(req.user?.type !== 'admin' && { isActive: true }),
      ...(query.active !== undefined && { isActive: query.active }),
    };

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { pointsRequired: 'asc' },
      }),
      prisma.reward.count({ where }),
    ]);

    const formattedRewards = rewards.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      pointsRequired: r.pointsRequired.toString(),
      category: r.category,
      imageUrl: r.imageUrl,
      available: r.available,
      maxClaims: r.maxClaims,
      totalClaimed: r.totalClaimed,
      isActive: r.isActive,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
    }));

    return paginatedResponse(res, formattedRewards, query.page, query.limit, total);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /rewards/{id}:
 *   get:
 *     summary: Get reward by ID
 *     tags: [Rewards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reward details
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const reward = await prisma.reward.findUnique({
      where: { id },
      include: {
        _count: {
          select: { claimedRewards: true },
        },
      },
    });

    if (!reward) {
      throw new AppError('Reward not found', 404, 'NOT_FOUND');
    }

    // Non-admins can't see inactive rewards
    if (!reward.isActive && req.user?.type !== 'admin') {
      throw new AppError('Reward not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      pointsRequired: reward.pointsRequired.toString(),
      category: reward.category,
      imageUrl: reward.imageUrl,
      available: reward.available,
      maxClaims: reward.maxClaims,
      totalClaimed: reward.totalClaimed,
      isActive: reward.isActive,
      validFrom: reward.validFrom,
      validUntil: reward.validUntil,
      claimCount: reward._count.claimedRewards,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /rewards:
 *   post:
 *     summary: Create new reward (admin only)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - pointsRequired
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               pointsRequired:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [DISCOUNT, PRODUCT, CASHBACK, SPECIAL]
 *               available:
 *                 type: integer
 *               maxClaims:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reward created
 */
const createRewardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  pointsRequired: z.number().min(100),
  category: z.enum(['DISCOUNT', 'PRODUCT', 'CASHBACK', 'SPECIAL']),
  imageUrl: z.string().url().optional(),
  available: z.number().min(0).default(0),
  maxClaims: z.number().min(0).default(0),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createRewardSchema.parse(req.body);

      const reward = await prisma.reward.create({
        data: {
          title: data.title,
          description: data.description,
          pointsRequired: BigInt(data.pointsRequired),
          category: data.category,
          imageUrl: data.imageUrl,
          available: data.available,
          maxClaims: data.maxClaims,
          validFrom: data.validFrom,
          validUntil: data.validUntil,
          isActive: true,
        },
      });

      return successResponse(
        res,
        {
          id: reward.id,
          title: reward.title,
          pointsRequired: reward.pointsRequired.toString(),
          category: reward.category,
          available: reward.available,
        },
        'Reward created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /rewards/{id}:
 *   patch:
 *     summary: Update reward (admin only)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reward updated
 */
const updateRewardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  pointsRequired: z.number().min(100).optional(),
  imageUrl: z.string().url().optional(),
  available: z.number().min(0).optional(),
  maxClaims: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = updateRewardSchema.parse(req.body);

      const reward = await prisma.reward.update({
        where: { id },
        data: {
          ...data,
          ...(data.pointsRequired && { pointsRequired: BigInt(data.pointsRequired) }),
        },
      });

      return successResponse(res, {
        id: reward.id,
        title: reward.title,
        pointsRequired: reward.pointsRequired.toString(),
        category: reward.category,
        isActive: reward.isActive,
        available: reward.available,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /rewards/{id}/claim:
 *   post:
 *     summary: Claim a reward
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reward claimed
 */
router.post(
  '/:id/claim',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const partnerId = req.user!.id;

      // Forward to loyalty redeem endpoint
      req.body = { rewardId: id };
      
      // Get reward and loyalty points
      const [reward, loyaltyPoints] = await Promise.all([
        prisma.reward.findUnique({ where: { id } }),
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
        throw new AppError(
          `Insufficient points. Need ${reward.pointsRequired}, have ${loyaltyPoints.balance}`,
          400,
          'INSUFFICIENT_POINTS'
        );
      }

      // Process claim
      const [updatedPoints, claim] = await prisma.$transaction([
        prisma.loyaltyPoints.update({
          where: { partnerId },
          data: {
            balance: { decrement: reward.pointsRequired },
            lifetimeRedeemed: { increment: reward.pointsRequired },
          },
        }),
        prisma.claimedReward.create({
          data: {
            partnerId,
            rewardId: id,
            pointsSpent: reward.pointsRequired,
            status: 'PENDING',
          },
        }),
        prisma.reward.update({
          where: { id },
          data: {
            available: { decrement: 1 },
            totalClaimed: { increment: 1 },
          },
        }),
      ]);

      return successResponse(res, {
        claim: {
          id: claim.id,
          rewardId: claim.rewardId,
          rewardTitle: reward.title,
          pointsSpent: claim.pointsSpent.toString(),
          status: claim.status,
        },
        newBalance: updatedPoints.balance.toString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;




