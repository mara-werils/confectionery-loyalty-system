/**
 * Public Stats API — no authentication required
 * Powers the Live Ecosystem Pulse Dashboard (/live)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';

const router = Router();

/** GET /public/stats — aggregate ecosystem metrics */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalPartners,
      totalTokensAgg,
      todayTransactions,
      allTimeTransactions,
      todayInterventions,
      totalInterventions,
      activeProposals,
      totalProposals,
      recentActivity,
      hourlyIssuance,
    ] = await Promise.all([
      prisma.partner.count({ where: { status: 'ACTIVE' } }),
      prisma.loyaltyPoints.aggregate({ _sum: { lifetimeEarned: true } }),
      prisma.transaction.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.transaction.count(),
      prisma.churnIntervention.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.churnIntervention.count(),
      prisma.proposal.count({ where: { status: 'ACTIVE' } }),
      prisma.proposal.count(),
      // Last 10 events for the live feed
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          pointsEarned: true,
          type: true,
          description: true,
          createdAt: true,
          partner: { select: { companyName: true } },
        },
      }),
      // Hourly token issuance for the last 24 hours
      prisma.transaction.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        _sum: { pointsEarned: true },
      }),
    ]);

    // Build 24-point hourly chart
    const hourlyMap: Record<string, number> = {};
    for (const row of hourlyIssuance) {
      const hour = new Date(row.createdAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      hourlyMap[key] = (hourlyMap[key] ?? 0) + Number(row._sum.pointsEarned ?? 0);
    }

    const chartData = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      return {
        hour: hour.toISOString(),
        label: hour.getUTCHours().toString().padStart(2, '0') + ':00',
        tokens: hourlyMap[hour.toISOString()] ?? 0,
      };
    });

    // Recent activity feed
    const feed = recentActivity.map(tx => ({
      id: tx.id,
      type: tx.type,
      message: tx.description || `${tx.partner.companyName} earned ${tx.pointsEarned} SWEET`,
      amount: tx.pointsEarned.toString(),
      company: tx.partner.companyName,
      timestamp: tx.createdAt.toISOString(),
    }));

    return successResponse(res, {
      totalPartners,
      totalSweetIssued: (totalTokensAgg._sum.lifetimeEarned ?? BigInt(0)).toString(),
      todayTransactions,
      allTimeTransactions,
      todayInterventions,
      totalInterventions,
      activeProposals,
      totalProposals,
      chartData,
      feed,
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
