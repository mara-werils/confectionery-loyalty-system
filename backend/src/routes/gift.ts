import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';

const router = Router();

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

    const sender = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { loyaltyPoints: true },
    });

    if (!sender) throw new AppError('Sender not found', 404, 'NOT_FOUND');
    if (!sender.loyaltyPoints || sender.loyaltyPoints.balance < BigInt(data.amount)) {
      throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }
    if (sender.walletAddress === data.receiverWallet) {
      throw new AppError('Cannot send to yourself', 400, 'SELF_TRANSFER');
    }

    // Deduct from sender
    await prisma.loyaltyPoints.update({
      where: { partnerId },
      data: { balance: { decrement: BigInt(data.amount) } },
    });

    // Credit receiver if they exist
    const receiver = await prisma.partner.findUnique({
      where: { walletAddress: data.receiverWallet },
    });
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

    const gifts = await prisma.tokenGift.findMany({
      where: {
        OR: [
          { senderWallet: partner.walletAddress },
          { receiverWallet: partner.walletAddress },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return successResponse(res, gifts.map((g: { id: string; senderWallet: string; receiverWallet: string; amount: number; message: string | null; createdAt: Date }) => ({
      ...g,
      direction: g.senderWallet === partner.walletAddress ? 'sent' : 'received',
    })));
  } catch (error) {
    return next(error);
  }
});

export default router;
