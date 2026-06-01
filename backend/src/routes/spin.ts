import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { io } from '../index';

const router = Router();

// Weighted prize pool: lower prizes more likely
const PRIZES = [
  { value: 5, weight: 30 },
  { value: 10, weight: 25 },
  { value: 15, weight: 18 },
  { value: 20, weight: 12 },
  { value: 25, weight: 7 },
  { value: 50, weight: 5 },
  { value: 100, weight: 2 },
  { value: 500, weight: 1 },
];

const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0);

function pickPrize(): number {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const p of PRIZES) {
    rand -= p.weight;
    if (rand <= 0) return p.value;
  }
  return PRIZES[0].value;
}

/** GET /spin/status */
router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastSpin = await prisma.spinHistory.findFirst({
      where: { partnerId, createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
    });

    const canSpin = !lastSpin;
    const nextSpinAt = lastSpin
      ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    return successResponse(res, { canSpin, nextSpinAt, lastPrize: lastSpin?.prize ?? null });
  } catch (error) {
    return next(error);
  }
});

/** POST /spin/play */
router.post('/play', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check cooldown
    const existing = await prisma.spinHistory.findFirst({
      where: { partnerId, createdAt: { gte: today } },
    });
    if (existing) {
      return res.status(429).json({ success: false, error: 'Already spun today', code: 'SPIN_COOLDOWN' });
    }

    const prize = pickPrize();

    // Record spin
    await prisma.spinHistory.create({ data: { partnerId, prize } });

    // Credit SWEET tokens
    await prisma.loyaltyPoints.upsert({
      where: { partnerId },
      update: {
        balance: { increment: BigInt(prize) },
        lifetimeEarned: { increment: BigInt(prize) },
      },
      create: {
        partnerId,
        balance: BigInt(prize),
        lifetimeEarned: BigInt(prize),
      },
    });

    // Broadcast activity
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    io.emit('activity:new', {
      type: 'spin',
      message: `${partner?.companyName || 'User'} won ${prize} SWEET on Spin Wheel`,
      amount: prize,
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, { prize, message: `You won ${prize} SWEET!` });
  } catch (error) {
    return next(error);
  }
});

export default router;
