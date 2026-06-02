import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { generateToken, generateRefreshToken, authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { verifyWalletSignature, verifyNonce } from '../services/ton';
import { config } from '../config';
import { Address } from '@ton/core';

function normalizeAddress(addr: string): string {
  try { return Address.parse(addr).toRawString(); } catch { return addr; }
}

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
  publicKey: z.string().min(1),
  companyName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  signature: z.string(),
  message: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
});

router.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);

      // Verify timestamp (max 5 minutes old)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - data.timestamp) > 300) {
        throw new AppError('Request expired', 401, 'EXPIRED_REQUEST');
      }

      // Verify nonce
      const isNonceValid = await verifyNonce(data.nonce);
      if (!isNonceValid) {
        throw new AppError('Nonce already used', 401, 'REPLAY_ATTACK');
      }

      // Verify wallet signature
      // In production this uses @ton/crypto signVerify.
      // TonConnect UI does not expose signData, so we accept the wallet address
      // as proof of ownership (wallet connection itself is the auth factor).
      // TonConnect UI does not expose signData, so wallet-connection-as-proof
      // is the auth factor. The bypass is only allowed in development.
      const sigSkipped =
        config.app.env === 'development' &&
        data.signature.startsWith('wallet-owned-');
      if (!sigSkipped) {
        const isValid = await verifyWalletSignature(
          data.publicKey,
          data.message,
          data.signature
        );
        if (!isValid) {
          throw new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE');
        }
      }

      // Check if partner already exists
      const existing = await prisma.partner.findUnique({
        where: { walletAddress: data.walletAddress },
      });

      if (existing) {
        // Allow upgrading a customer placeholder to a full business partner
        if (existing.companyName.startsWith('Customer_')) {
          const updated = await prisma.partner.update({
            where: { id: existing.id },
            data: {
              companyName: data.companyName,
              email: data.email,
              phone: data.phone,
              status: 'PENDING',
            },
          });
          const token = generateToken({ sub: updated.id, walletAddress: updated.walletAddress, type: 'partner' });
          const refreshToken = generateRefreshToken({ sub: updated.id, walletAddress: updated.walletAddress, type: 'partner' });
          return successResponse(res, {
            partner: { id: updated.id, walletAddress: updated.walletAddress, companyName: updated.companyName, tier: updated.tier, status: updated.status },
            token,
            refreshToken,
          }, 'Registration successful', 201);
        }
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
      return next(error);
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
 *               - publicKey
 *               - signature
 *               - message
 *               - nonce
 *               - timestamp
 *             properties:
 *               walletAddress:
 *                 type: string
 *               publicKey:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *               nonce:
 *                 type: string
 *               timestamp:
 *                 type: number
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const loginSchema = z.object({
  walletAddress: z.string().min(1),
  publicKey: z.string().min(1),
  signature: z.string(),
  message: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
});

router.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);

      // Verify timestamp (max 5 minutes old)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - data.timestamp) > 300) {
        throw new AppError('Request expired', 401, 'EXPIRED_REQUEST');
      }

      // Verify nonce
      const isNonceValid = await verifyNonce(data.nonce);
      if (!isNonceValid) {
        throw new AppError('Nonce already used', 401, 'REPLAY_ATTACK');
      }

      // Verify wallet signature
      const isValid = await verifyWalletSignature(
        data.publicKey,
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
      return next(error);
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

/**
 * POST /auth/customer
 * Passwordless auto-login for customers: find-or-create partner by wallet address.
 * No signature required — wallet address is the identity (demo-grade auth).
 */
const customerAuthSchema = z.object({
  walletAddress: z.string().min(10),
});

router.post(
  '/customer',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress: rawAddr } = customerAuthSchema.parse(req.body);
      const walletAddress = normalizeAddress(rawAddr);

      // Find or create a customer partner record — try normalized, then original
      let partner = await prisma.partner.findUnique({
        where: { walletAddress },
        include: { loyaltyPoints: true },
      });
      if (!partner && walletAddress !== rawAddr) {
        partner = await prisma.partner.findUnique({
          where: { walletAddress: rawAddr },
          include: { loyaltyPoints: true },
        });
      }

      if (!partner) {
        partner = await prisma.partner.create({
          data: {
            walletAddress,
            companyName: `Customer_${walletAddress.slice(0, 8)}`,
            status: 'ACTIVE',
            loyaltyPoints: {
              create: { balance: 0n, lifetimeEarned: 0n, lifetimeRedeemed: 0n },
            },
          },
          include: { loyaltyPoints: true },
        });
      } else if (!partner.loyaltyPoints) {
        // Ensure loyaltyPoints row exists
        await prisma.loyaltyPoints.create({
          data: { partnerId: partner.id, balance: 0n, lifetimeEarned: 0n, lifetimeRedeemed: 0n },
        });
      }

      const token = generateToken({
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
        },
        token,
      }, 'Customer authenticated', 200);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;




