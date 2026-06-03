import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Address } from '@ton/core';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Normalize any TON address format (UQ..., EQ..., 0:hex) to raw "0:hex" form.
 * Falls back to the original string if parsing fails.
 */
function normalizeAddress(addr: string): string {
  try {
    return Address.parse(addr).toRawString();
  } catch {
    return addr;
  }
}

const giftSchema = z.object({
  receiverWallet: z.string().min(1),
  amount: z.number().int().positive().max(100000),
  message: z.string().max(200).optional(),
});

/** POST /gift/send */
router.post('/send', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = giftSchema.parse(req.body);
    const partnerId = req.user!.id;
    const receiverRaw = normalizeAddress(data.receiverWallet);

    const sender = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { loyaltyPoints: true },
    });

    if (!sender) throw new AppError('Sender not found', 404, 'NOT_FOUND');
    const senderBalance = sender.loyaltyPoints?.balance ?? 0n;
    logger.debug(`[Gift] sender=${sender.companyName} id=${partnerId} balance=${senderBalance} amount=${data.amount} hasLP=${!!sender.loyaltyPoints}`);
    if (!sender.loyaltyPoints || senderBalance < BigInt(data.amount)) {
      throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }

    const senderRaw = normalizeAddress(sender.walletAddress);
    if (senderRaw === receiverRaw) {
      throw new AppError('Cannot send to yourself', 400, 'SELF_TRANSFER');
    }

    // Deduct from sender
    await prisma.loyaltyPoints.update({
      where: { partnerId },
      data: { balance: { decrement: BigInt(data.amount) } },
    });

    // Find receiver by normalized address — try exact match first, then normalize all
    let receiver = await prisma.partner.findUnique({
      where: { walletAddress: data.receiverWallet },
    });
    if (!receiver) {
      receiver = await prisma.partner.findUnique({
        where: { walletAddress: receiverRaw },
      });
    }
    if (!receiver) {
      // Brute-force: find by normalizing all addresses (small DB, acceptable for MVP)
      const allPartners = await prisma.partner.findMany({ select: { id: true, walletAddress: true } });
      const match = allPartners.find(p => normalizeAddress(p.walletAddress) === receiverRaw);
      if (match) {
        receiver = await prisma.partner.findUnique({ where: { id: match.id } });
      }
    }
    if (receiver) {
      await prisma.loyaltyPoints.upsert({
        where: { partnerId: receiver.id },
        update: {
          balance: { increment: BigInt(data.amount) },
          lifetimeEarned: { increment: BigInt(data.amount) },
        },
        create: {
          partnerId: receiver.id,
          balance: BigInt(data.amount),
          lifetimeEarned: BigInt(data.amount),
        },
      });
    }

    // Record gift
    const gift = await prisma.tokenGift.create({
      data: {
        senderWallet: sender.walletAddress,
        receiverWallet: data.receiverWallet,
        amount: data.amount,
        message: data.message,
      },
    });

    // Notify receiver
    io.to(`wallet:${data.receiverWallet}`).emit('tokens:received', {
      amount: data.amount,
      message: `Gift from ${sender.companyName}: ${data.message || ''}`.trim(),
    });

    // Broadcast activity
    io.emit('activity:new', {
      type: 'gift',
      message: `${sender.companyName} sent ${data.amount} SWEET as a gift`,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, {
      id: gift.id,
      amount: data.amount,
      receiverWallet: data.receiverWallet,
      message: data.message,
    });
  } catch (error) {
    return next(error);
  }
});

/** GET /gift/history */
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = await prisma.partner.findUnique({ where: { id: req.user!.id } });
    if (!partner) throw new AppError('Not found', 404, 'NOT_FOUND');

    const rawAddr = normalizeAddress(partner.walletAddress);

    const gifts = await prisma.tokenGift.findMany({
      where: {
        OR: [
          { senderWallet: partner.walletAddress },
          { senderWallet: rawAddr },
          { receiverWallet: partner.walletAddress },
          { receiverWallet: rawAddr },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return successResponse(res, gifts.map((g: { id: string; senderWallet: string; receiverWallet: string; amount: number; message: string | null; createdAt: Date }) => ({
      ...g,
      direction: (g.senderWallet === partner.walletAddress || normalizeAddress(g.senderWallet) === rawAddr) ? 'sent' : 'received',
    })));
  } catch (error) {
    return next(error);
  }
});

export default router;
