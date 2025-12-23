import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { authenticate, requirePartner } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { calculatePoints } from '../services/loyalty';

const router = Router();

// Tier multipliers
const TIER_MULTIPLIERS = {
  BRONZE: 1.0,
  SILVER: 1.5,
  GOLD: 2.0,
};

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Record a new transaction (earn points)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Transaction amount in KZT
 *               type:
 *                 type: string
 *                 enum: [PURCHASE, BONUS, REFERRAL, PROMOTION]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction recorded
 */
const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['PURCHASE', 'BONUS', 'REFERRAL', 'PROMOTION']),
  description: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTransactionSchema.parse(req.body);
      const partnerId = req.user!.id;

      // Get partner info for tier multiplier
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: { loyaltyPoints: true },
      });

      if (!partner) {
        throw new AppError('Partner not found', 404, 'NOT_FOUND');
      }

      if (partner.status !== 'ACTIVE') {
        throw new AppError('Partner account is not active', 400, 'ACCOUNT_NOT_ACTIVE');
      }

      // Calculate points earned based on tier
      const multiplier = TIER_MULTIPLIERS[partner.tier];
      const pointsEarned = calculatePoints(data.amount, multiplier);

      // Create transaction and update points
      const [transaction, updatedPoints] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            partnerId,
            amount: BigInt(Math.round(data.amount * 100)), // Store in smallest unit
            pointsEarned: BigInt(pointsEarned),
            type: data.type,
            description: data.description,
          },
        }),
        prisma.loyaltyPoints.update({
          where: { partnerId },
          data: {
            balance: { increment: BigInt(pointsEarned) },
            lifetimeEarned: { increment: BigInt(pointsEarned) },
          },
        }),
      ]);

      // Emit real-time update
      io.to(`partner:${partnerId}`).emit('transaction:created', {
        id: transaction.id,
        amount: transaction.amount.toString(),
        pointsEarned: transaction.pointsEarned.toString(),
        type: transaction.type,
      });

      io.to(`partner:${partnerId}`).emit('balance:updated', {
        balance: updatedPoints.balance.toString(),
        lifetimeEarned: updatedPoints.lifetimeEarned.toString(),
      });

      return successResponse(
        res,
        {
          transaction: {
            id: transaction.id,
            amount: transaction.amount.toString(),
            pointsEarned: transaction.pointsEarned.toString(),
            type: transaction.type,
            description: transaction.description,
            createdAt: transaction.createdAt,
          },
          newBalance: updatedPoints.balance.toString(),
        },
        'Transaction recorded successfully',
        201
      );
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PURCHASE, BONUS, REFERRAL, PROMOTION]
 *     responses:
 *       200:
 *         description: Transaction list
 */
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['PURCHASE', 'BONUS', 'REFERRAL', 'PROMOTION']).optional(),
  partnerId: z.string().optional(), // Admin only
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    // Partners can only see their own transactions
    const partnerId = req.user!.type === 'admin' 
      ? query.partnerId 
      : req.user!.id;

    const where = {
      ...(partnerId && { partnerId }),
      ...(query.type && { type: query.type }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: query.limit,
        include: {
          partner: {
            select: {
              companyName: true,
              walletAddress: true,
            },
          },
        },
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
      partner: req.user!.type === 'admin' ? t.partner : undefined,
      createdAt: t.createdAt,
    }));

    return paginatedResponse(res, formattedTransactions, query.page, query.limit, total);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
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
 *         description: Transaction details
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
            walletAddress: true,
            tier: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (req.user!.type === 'partner' && transaction.partnerId !== req.user!.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return successResponse(res, {
      id: transaction.id,
      amount: transaction.amount.toString(),
      pointsEarned: transaction.pointsEarned.toString(),
      type: transaction.type,
      description: transaction.description,
      txHash: transaction.txHash,
      blockNumber: transaction.blockNumber?.toString(),
      partner: transaction.partner,
      createdAt: transaction.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;




