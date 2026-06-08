import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate, requirePartner } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import {
  getPendingCommissionOnChain,
  distributeCommissionOnChain,
  getContractStats,
  fundContractOnChain,
  COMMISSION_RATES,
  MIN_PAYOUT_NANO,
  CONTRACT_ADDRESS,
} from '../services/revenue.service';

const router = Router();

const TONVIEWER_BASE = 'https://testnet.tonviewer.com';

/**
 * GET /settlement/status
 * Returns the current partner's pending on-chain commission + contract metadata.
 */
router.get(
  '/status',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await prisma.partner.findUnique({
        where: { id: req.user!.id },
        select: { walletAddress: true, tier: true, companyName: true },
      });

      if (!partner) throw new AppError('Partner not found', 404, 'NOT_FOUND');

      const [pendingNano, stats] = await Promise.all([
        getPendingCommissionOnChain(partner.walletAddress),
        getContractStats(),
      ]);

      const commissionRate = COMMISSION_RATES[partner.tier] ?? 300;
      const canDistribute = pendingNano >= MIN_PAYOUT_NANO;
      const progress = Number((pendingNano * 100n) / MIN_PAYOUT_NANO);

      return successResponse(res, {
        partner: {
          wallet: partner.walletAddress,
          tier: partner.tier,
          commissionRate,        // basis points (300 = 3%)
          commissionPct: commissionRate / 100,  // human-readable %
        },
        pending: {
          nanoTon: pendingNano.toString(),
          ton: (Number(pendingNano) / 1e9).toFixed(4),
          progressPct: Math.min(progress, 100),
          canDistribute,
          minPayoutTon: '1.0000',
        },
        contract: {
          address: CONTRACT_ADDRESS,
          explorerUrl: `${TONVIEWER_BASE}/${CONTRACT_ADDRESS}`,
          totalDistributedTon: (Number(stats.totalDistributed) / 1e9).toFixed(4),
          platformBalanceTon: (Number(stats.platformBalance) / 1e9).toFixed(4),
          contractBalanceTon: (Number(stats.contractBalance) / 1e9).toFixed(4),
          payoutCount: stats.payoutCount.toString(),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /settlement/history
 * Returns the partner's payout history from DB.
 */
router.get(
  '/history',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payouts = await prisma.commissionPayout.findMany({
        where: { partnerId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const formatted = payouts.map((p) => ({
        id: p.id,
        amountNano: p.amount.toString(),
        amountTon: (Number(p.amount) / 1e9).toFixed(4),
        tier: p.tier,
        period: p.period,
        status: p.status,
        txHash: p.txHash,
        explorerUrl: p.txHash
          ? `${TONVIEWER_BASE}/${CONTRACT_ADDRESS}`
          : null,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      }));

      return successResponse(res, {
        payouts: formatted,
        totalPaidTon: payouts
          .reduce((acc, p) => acc + Number(p.amount), 0)
          .toFixed(4),
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /settlement/distribute
 * Triggers on-chain distributeCommission for the authenticated partner.
 * Requires pending >= 1 TON (enforced by smart contract).
 */
router.post(
  '/distribute',
  authenticate,
  requirePartner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await prisma.partner.findUnique({
        where: { id: req.user!.id },
        select: { walletAddress: true, tier: true, companyName: true },
      });

      if (!partner) throw new AppError('Partner not found', 404, 'NOT_FOUND');

      const { txRef, amountNano, explorerUrl } = await distributeCommissionOnChain(
        partner.walletAddress,
        req.user!.id,
        partner.tier
      );

      const amountTon = (Number(amountNano) / 1e9).toFixed(4);

      // Broadcast live update to all connected clients
      io.emit('activity:new', {
        type: 'settlement',
        message: `💰 ${partner.companyName} claimed ${amountTon} TON commission`,
        amount: amountTon,
        timestamp: new Date().toISOString(),
      });

      io.to(`partner:${req.user!.id}`).emit('settlement:paid', {
        amountTon,
        txRef,
        explorerUrl,
      });

      return successResponse(res, {
        txRef,
        amountTon,
        explorerUrl,
        message: `${amountTon} TON commission dispatched on-chain`,
      });
    } catch (error) {
      // Surface contract errors (insufficient balance, below minimum) as 400
      const e = error as Error;
      if (e.message?.includes('below minimum') || e.message?.includes('insufficient')) {
        return next(new AppError(e.message, 400, 'DISTRIBUTION_ERROR'));
      }
      return next(error);
    }
  }
);

/**
 * POST /settlement/fund
 * Admin utility: send TON to the contract to replenish its payout reserve.
 * Body: { amountTon: number }
 */
router.post(
  '/fund',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.type !== 'admin') {
        throw new AppError('Admin only', 403, 'FORBIDDEN');
      }

      const { amountTon } = req.body as { amountTon?: number };
      if (!amountTon || amountTon <= 0) {
        throw new AppError('amountTon must be > 0', 400, 'VALIDATION_ERROR');
      }

      const txRef = await fundContractOnChain(amountTon);

      return successResponse(res, {
        txRef,
        amountTon,
        contractAddress: CONTRACT_ADDRESS,
        explorerUrl: `${TONVIEWER_BASE}/${CONTRACT_ADDRESS}`,
        message: `${amountTon} TON sent to RevenueDistribution contract`,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /settlement/global-stats
 * Public endpoint — ecosystem-level commission stats.
 */
router.get(
  '/global-stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [stats, dbStats] = await Promise.all([
        getContractStats(),
        prisma.commissionPayout.aggregate({
          _count: true,
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
      ]);

      return successResponse(res, {
        onChain: {
          totalDistributedTon: (Number(stats.totalDistributed) / 1e9).toFixed(4),
          contractBalanceTon: (Number(stats.contractBalance) / 1e9).toFixed(4),
          payoutCount: stats.payoutCount.toString(),
        },
        database: {
          completedPayouts: dbStats._count,
          totalPaidTon: (Number(dbStats._sum.amount ?? 0n) / 1e9).toFixed(4),
        },
        commissionRates: {
          BRONZE: '3%',
          SILVER: '5%',
          GOLD: '7%',
          platform: '1%',
        },
        contractAddress: CONTRACT_ADDRESS,
        explorerUrl: `${TONVIEWER_BASE}/${CONTRACT_ADDRESS}`,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
