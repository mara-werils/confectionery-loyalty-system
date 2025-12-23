import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: Get all partners (admin only)
 *     tags: [Partners]
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
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [BRONZE, SILVER, GOLD]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, SUSPENDED, BANNED]
 *     responses:
 *       200:
 *         description: List of partners
 */
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  search: z.string().optional(),
});

router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const where = {
        ...(query.tier && { tier: query.tier }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { companyName: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { walletAddress: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [partners, total] = await Promise.all([
        prisma.partner.findMany({
          where,
          skip,
          take: query.limit,
          include: {
            loyaltyPoints: true,
            _count: {
              select: {
                transactions: true,
                claimedRewards: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.partner.count({ where }),
      ]);

      const formattedPartners = partners.map((p) => ({
        id: p.id,
        walletAddress: p.walletAddress,
        companyName: p.companyName,
        email: p.email,
        tier: p.tier,
        status: p.status,
        loyaltyPoints: p.loyaltyPoints
          ? {
              balance: p.loyaltyPoints.balance.toString(),
              lifetimeEarned: p.loyaltyPoints.lifetimeEarned.toString(),
            }
          : null,
        transactionCount: p._count.transactions,
        claimedRewardsCount: p._count.claimedRewards,
        createdAt: p.createdAt,
      }));

      return paginatedResponse(res, formattedPartners, query.page, query.limit, total);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /partners/{id}:
 *   get:
 *     summary: Get partner by ID
 *     tags: [Partners]
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
 *         description: Partner details
 *       404:
 *         description: Partner not found
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Partners can only view their own profile
    if (req.user!.type === 'partner' && req.user!.id !== id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        loyaltyPoints: true,
        _count: {
          select: {
            transactions: true,
            claimedRewards: true,
            commissionPayouts: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, {
      id: partner.id,
      walletAddress: partner.walletAddress,
      companyName: partner.companyName,
      email: partner.email,
      phone: partner.phone,
      tier: partner.tier,
      status: partner.status,
      loyaltyPoints: partner.loyaltyPoints
        ? {
            balance: partner.loyaltyPoints.balance.toString(),
            lifetimeEarned: partner.loyaltyPoints.lifetimeEarned.toString(),
            lifetimeRedeemed: partner.loyaltyPoints.lifetimeRedeemed.toString(),
          }
        : null,
      stats: {
        transactions: partner._count.transactions,
        claimedRewards: partner._count.claimedRewards,
        commissionPayouts: partner._count.commissionPayouts,
      },
      createdAt: partner.createdAt,
      lastLoginAt: partner.lastLoginAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /partners/{id}:
 *   patch:
 *     summary: Update partner
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               email:
 *                 type: string
 *               tier:
 *                 type: string
 *                 enum: [BRONZE, SILVER, GOLD]
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, SUSPENDED, BANNED]
 *     responses:
 *       200:
 *         description: Partner updated
 */
const updateSchema = z.object({
  companyName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
});

router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    // Partners can only update their own basic info
    if (req.user!.type === 'partner') {
      if (req.user!.id !== id) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
      // Partners can't change their tier or status
      delete data.tier;
      delete data.status;
    }

    const partner = await prisma.partner.update({
      where: { id },
      data,
      include: { loyaltyPoints: true },
    });

    return successResponse(res, {
      id: partner.id,
      walletAddress: partner.walletAddress,
      companyName: partner.companyName,
      email: partner.email,
      tier: partner.tier,
      status: partner.status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;




