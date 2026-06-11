import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /analytics/summary:
 *   get:
 *     summary: Get dashboard summary statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
router.get(
  '/summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.type === 'admin') {
        // Admin summary - all partners
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
          totalPartners,
          activePartners,
          totalTransactions,
          pointsAggregate,
          redeemedAggregate,
          recentTransactions,
          tierDistribution,
          currentWeekTx,
          prevWeekTx,
          currentWeekPartners,
          prevWeekPartners,
          currentWeekPoints,
          prevWeekPoints,
          activePartnersLast30d,
        ] = await Promise.all([
          prisma.partner.count(),
          prisma.partner.count({ where: { status: 'ACTIVE' } }),
          prisma.transaction.count(),
          prisma.loyaltyPoints.aggregate({ _sum: { lifetimeEarned: true } }),
          prisma.loyaltyPoints.aggregate({ _sum: { lifetimeRedeemed: true } }),
          prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { partner: { select: { companyName: true } } },
          }),
          prisma.partner.groupBy({ by: ['tier'], _count: true }),
          prisma.transaction.count({ where: { createdAt: { gte: weekAgo } } }),
          prisma.transaction.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
          prisma.partner.count({ where: { createdAt: { gte: weekAgo } } }),
          prisma.partner.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
          prisma.transaction.aggregate({ where: { createdAt: { gte: weekAgo } }, _sum: { pointsEarned: true } }),
          prisma.transaction.aggregate({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } }, _sum: { pointsEarned: true } }),
          prisma.transaction.groupBy({
            by: ['partnerId'],
            where: { createdAt: { gte: thirtyDaysAgo } },
          }).then((rows) => rows.length),
        ]);

        const totalPointsIssued = Number(pointsAggregate._sum.lifetimeEarned || 0n);
        const totalPointsRedeemed = Number(redeemedAggregate._sum.lifetimeRedeemed || 0n);
        const avgPointsPerTransaction = totalTransactions > 0 ? totalPointsIssued / totalTransactions : 0;

        const tierMap: Record<string, number> = {};
        tierDistribution.forEach((t) => { tierMap[t.tier] = t._count; });

        const calcGrowth = (current: number, prev: number): number | null => {
          if (prev === 0) return null;
          return Math.round(((current - prev) / prev) * 1000) / 10;
        };

        return successResponse(res, {
          totalPartners,
          activePartners,
          activePartnersLast30d,
          totalTransactions,
          totalPointsIssued,
          totalPointsRedeemed,
          avgPointsPerTransaction,
          tierDistribution: tierMap,
          growth: {
            transactions: calcGrowth(currentWeekTx, prevWeekTx),
            partners: calcGrowth(currentWeekPartners, prevWeekPartners),
            pointsIssued: calcGrowth(
              Number(currentWeekPoints._sum.pointsEarned || 0n),
              Number(prevWeekPoints._sum.pointsEarned || 0n)
            ),
          },
          recentTransactions: recentTransactions.map((t) => ({
            id: t.id,
            partnerName: t.partner.companyName,
            amount: t.amount.toString(),
            pointsEarned: t.pointsEarned.toString(),
            type: t.type,
            createdAt: t.createdAt,
          })),
        });
      } else {
        // Partner summary - own data
        const partnerId = req.user!.id;

        const [partner, transactionStats, recentTransactions, claimedRewards,
          totalPartners, totalTransactions, totalPointsAgg] = await Promise.all([
          prisma.partner.findUnique({
            where: { id: partnerId },
            include: { loyaltyPoints: true },
          }),
          prisma.transaction.aggregate({
            where: { partnerId },
            _count: true,
            _sum: { pointsEarned: true, amount: true },
          }),
          prisma.transaction.findMany({
            where: { partnerId },
            take: 5,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.claimedReward.findMany({
            where: { partnerId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { reward: { select: { title: true } } },
          }),
          // Ecosystem metrics (visible on partner dashboard)
          prisma.partner.count({ where: { status: 'ACTIVE' } }),
          prisma.transaction.count(),
          prisma.loyaltyPoints.aggregate({ _sum: { lifetimeEarned: true } }),
        ]);

        return successResponse(res, {
          // Ecosystem-level fields (matches admin shape so Dashboard.tsx works for all roles)
          totalPartners,
          totalTransactions,
          totalPointsIssued: Number(totalPointsAgg._sum.lifetimeEarned ?? 0n),
          // Partner-specific data
          balance: {
            current: (partner?.loyaltyPoints?.balance || 0n).toString(),
            lifetimeEarned: (partner?.loyaltyPoints?.lifetimeEarned || 0n).toString(),
            lifetimeRedeemed: (partner?.loyaltyPoints?.lifetimeRedeemed || 0n).toString(),
          },
          stats: {
            totalTransactions: transactionStats._count,
            totalAmount: (transactionStats._sum.amount || 0n).toString(),
            totalPointsEarned: (transactionStats._sum.pointsEarned || 0n).toString(),
          },
          tier: partner?.tier,
          recentTransactions: recentTransactions.map((t) => ({
            id: t.id,
            amount: t.amount.toString(),
            pointsEarned: t.pointsEarned.toString(),
            type: t.type,
            createdAt: t.createdAt,
          })),
          recentClaims: claimedRewards.map((c) => ({
            id: c.id,
            rewardTitle: c.reward.title,
            pointsSpent: c.pointsSpent.toString(),
            status: c.status,
            createdAt: c.createdAt,
          })),
        });
      }
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /analytics/growth:
 *   get:
 *     summary: Get growth statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: month
 *     responses:
 *       200:
 *         description: Growth statistics
 */
router.get(
  '/growth',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as string) || 'month';
      const partnerId = req.user!.type === 'partner' ? req.user!.id : undefined;

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get transactions in period
      const transactions = await prisma.transaction.findMany({
        where: {
          ...(partnerId && { partnerId }),
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const dailyData: Record<string, { count: number; points: bigint; amount: bigint }> = {};

      for (const tx of transactions) {
        const dateKey = tx.createdAt.toISOString().split('T')[0]!;
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { count: 0, points: 0n, amount: 0n };
        }
        dailyData[dateKey].count++;
        dailyData[dateKey].points += tx.pointsEarned;
        dailyData[dateKey].amount += tx.amount;
      }

      const chartData = Object.entries(dailyData).map(([date, data]) => ({
        date,
        transactions: data.count,
        points: data.points.toString(),
        amount: data.amount.toString(),
      }));

      // Get totals
      const totals = transactions.reduce(
        (acc, tx) => {
          acc.transactions++;
          acc.points += tx.pointsEarned;
          acc.amount += tx.amount;
          return acc;
        },
        { transactions: 0, points: 0n, amount: 0n }
      );

      return successResponse(res, {
        period,
        startDate,
        endDate: now,
        totals: {
          transactions: totals.transactions,
          points: totals.points.toString(),
          amount: totals.amount.toString(),
        },
        chartData,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /analytics/top-partners:
 *   get:
 *     summary: Get top 5 partners by points issued this week
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top partners leaderboard
 */
router.get(
  '/top-partners',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const grouped = await prisma.transaction.groupBy({
        by: ['partnerId'],
        where: { createdAt: { gte: weekAgo } },
        _sum: { pointsEarned: true },
        _count: { id: true },
        orderBy: { _sum: { pointsEarned: 'desc' } },
        take: 5,
      });

      const partnerIds = grouped.map((g) => g.partnerId);
      const partners = await prisma.partner.findMany({
        where: { id: { in: partnerIds } },
        select: { id: true, companyName: true, tier: true },
      });

      const partnerMap = new Map(partners.map((p) => [p.id, p]));

      const topPartners = grouped.map((g, index) => ({
        rank: index + 1,
        partnerId: g.partnerId,
        companyName: partnerMap.get(g.partnerId)?.companyName || 'Unknown',
        tier: partnerMap.get(g.partnerId)?.tier || 'BRONZE',
        pointsIssued: (g._sum.pointsEarned || 0n).toString(),
        transactionCount: g._count.id,
      }));

      return successResponse(res, topPartners);
    } catch (error) {
      next(error);
    }
  }
);

export default router;




