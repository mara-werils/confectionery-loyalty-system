import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { io } from '../index';

const router = Router();

const BASE_BONUS = 10;

function getMultiplier(streak: number): number {
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  return 1;
}

/** GET /checkin/status */
router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed today
    const todayCheckin = await prisma.dailyCheckin.findFirst({
      where: { partnerId, createdAt: { gte: today } },
    });

    // Get last checkin for streak calculation
    const lastCheckin = await prisma.dailyCheckin.findFirst({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });

    let currentStreak = 0;
    if (lastCheckin) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastCheckin.createdAt >= yesterday) {
        currentStreak = lastCheckin.streak;
      }
    }

    // Get last 7 days history
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const history = await prisma.dailyCheckin.findMany({
      where: { partnerId, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, bonus: true, streak: true },
    });

    const multiplier = getMultiplier(currentStreak + (todayCheckin ? 0 : 1));

    return successResponse(res, {
      canClaim: !todayCheckin,
      currentStreak,
      multiplier,
      nextBonus: BASE_BONUS * multiplier,
      history: history.map((h: { createdAt: Date; bonus: number; streak: number }) => ({
        date: h.createdAt.toISOString().split('T')[0],
        bonus: h.bonus,
        streak: h.streak,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /checkin/claim */
router.post('/claim', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed
    const existing = await prisma.dailyCheckin.findFirst({
      where: { partnerId, createdAt: { gte: today } },
    });
    if (existing) {
      return res.status(429).json({ success: false, error: 'Already claimed today', code: 'ALREADY_CLAIMED' });
    }

    // Calculate streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastCheckin = await prisma.dailyCheckin.findFirst({
      where: { partnerId, createdAt: { gte: yesterday, lt: today } },
      orderBy: { createdAt: 'desc' },
    });

    const streak = lastCheckin ? lastCheckin.streak + 1 : 1;
    const multiplier = getMultiplier(streak);
    const bonus = BASE_BONUS * multiplier;

    // Record checkin
    await prisma.dailyCheckin.create({ data: { partnerId, streak, bonus } });

    // Credit SWEET
    await prisma.loyaltyPoints.upsert({
      where: { partnerId },
      update: {
        balance: { increment: BigInt(bonus) },
        lifetimeEarned: { increment: BigInt(bonus) },
      },
      create: {
        partnerId,
        balance: BigInt(bonus),
        lifetimeEarned: BigInt(bonus),
      },
    });

    // Broadcast
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    io.emit('activity:new', {
      type: 'checkin',
      message: `${partner?.companyName || 'User'} claimed daily bonus (+${bonus} SWEET, ${streak} day streak)`,
      amount: bonus,
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, { bonus, streak, multiplier, message: `+${bonus} SWEET (x${multiplier} streak!)` });
  } catch (error) {
    return next(error);
  }
});

export default router;
