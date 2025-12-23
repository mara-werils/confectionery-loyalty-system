import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { generateToken, generateRefreshToken, authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { verifyWalletSignature } from '../services/ton';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new partner
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - companyName
 *               - signature
 *               - message
 *             properties:
 *               walletAddress:
 *                 type: string
 *               companyName:
 *                 type: string
 *               email:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Partner registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Partner already exists
 */
const registerSchema = z.object({
  walletAddress: z.string().min(1),
  companyName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  signature: z.string(),
  message: z.string(),
});

router.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);

      // Verify wallet signature
      const isValid = await verifyWalletSignature(
        data.walletAddress,
        data.message,
        data.signature
      );

      if (!isValid) {
        throw new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE');
      }

      // Check if partner already exists
      const existing = await prisma.partner.findUnique({
        where: { walletAddress: data.walletAddress },
      });

      if (existing) {
        throw new AppError('Partner already registered', 409, 'ALREADY_EXISTS');
      }

      // Create partner
      const partner = await prisma.partner.create({
        data: {
          walletAddress: data.walletAddress,
          companyName: data.companyName,
          email: data.email,
          phone: data.phone,
          status: 'PENDING',
          loyaltyPoints: {
            create: {
              balance: 0n,
              lifetimeEarned: 0n,
              lifetimeRedeemed: 0n,
            },
          },
        },
        include: {
          loyaltyPoints: true,
        },
      });

      // Generate tokens
      const token = generateToken({
        sub: partner.id,
        walletAddress: partner.walletAddress,
        type: 'partner',
      });

      const refreshToken = generateRefreshToken({
        sub: partner.id,
        walletAddress: partner.walletAddress,
        type: 'partner',
      });

      return successResponse(
        res,
        {
          partner: {
            id: partner.id,
            walletAddress: partner.walletAddress,
            companyName: partner.companyName,
            tier: partner.tier,
            status: partner.status,
          },
          token,
          refreshToken,
        },
        'Registration successful',
        201
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with wallet signature
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - signature
 *               - message
 *             properties:
 *               walletAddress:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const loginSchema = z.object({
  walletAddress: z.string().min(1),
  signature: z.string(),
  message: z.string(),
});

router.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);

      // Verify wallet signature
      const isValid = await verifyWalletSignature(
        data.walletAddress,
        data.message,
        data.signature
      );

      if (!isValid) {
        throw new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE');
      }

      // Find partner
      const partner = await prisma.partner.findUnique({
        where: { walletAddress: data.walletAddress },
        include: { loyaltyPoints: true },
      });

      if (!partner) {
        throw new AppError('Partner not found', 404, 'NOT_FOUND');
      }

      if (partner.status === 'BANNED') {
        throw new AppError('Account is banned', 403, 'ACCOUNT_BANNED');
      }

      // Update last login
      await prisma.partner.update({
        where: { id: partner.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const token = generateToken({
        sub: partner.id,
        walletAddress: partner.walletAddress,
        type: 'partner',
      });

      const refreshToken = generateRefreshToken({
        sub: partner.id,
        walletAddress: partner.walletAddress,
        type: 'partner',
      });

      return successResponse(res, {
        partner: {
          id: partner.id,
          walletAddress: partner.walletAddress,
          companyName: partner.companyName,
          tier: partner.tier,
          status: partner.status,
          loyaltyPoints: partner.loyaltyPoints
            ? {
                balance: partner.loyaltyPoints.balance.toString(),
                lifetimeEarned: partner.loyaltyPoints.lifetimeEarned.toString(),
                lifetimeRedeemed: partner.loyaltyPoints.lifetimeRedeemed.toString(),
              }
            : null,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.type === 'partner') {
      const partner = await prisma.partner.findUnique({
        where: { id: req.user!.id },
        include: { loyaltyPoints: true },
      });

      if (!partner) {
        throw new AppError('Partner not found', 404, 'NOT_FOUND');
      }

      return successResponse(res, {
        type: 'partner',
        partner: {
          id: partner.id,
          walletAddress: partner.walletAddress,
          companyName: partner.companyName,
          email: partner.email,
          tier: partner.tier,
          status: partner.status,
          loyaltyPoints: partner.loyaltyPoints
            ? {
                balance: partner.loyaltyPoints.balance.toString(),
                lifetimeEarned: partner.loyaltyPoints.lifetimeEarned.toString(),
                lifetimeRedeemed: partner.loyaltyPoints.lifetimeRedeemed.toString(),
              }
            : null,
          createdAt: partner.createdAt,
        },
      });
    } else {
      const admin = await prisma.admin.findUnique({
        where: { id: req.user!.id },
      });

      if (!admin) {
        throw new AppError('Admin not found', 404, 'NOT_FOUND');
      }

      return successResponse(res, {
        type: 'admin',
        admin: {
          id: admin.id,
          walletAddress: admin.walletAddress,
          name: admin.name,
          role: admin.role,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;




