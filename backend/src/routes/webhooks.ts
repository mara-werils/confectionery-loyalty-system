import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Telegram Bot Webhook
 * Receives updates from Telegram
 */
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    logger.info('Received Telegram update:', update);

    // Handle different update types
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';

      // Handle commands
      if (text.startsWith('/')) {
        const command = text.split(' ')[0]?.toLowerCase();

        switch (command) {
          case '/start':
            // Welcome message
            logger.info(`New user started bot: ${chatId}`);
            break;

          case '/balance':
            // Get user balance
            logger.info(`Balance request from: ${chatId}`);
            break;

          case '/rewards':
            // Show available rewards
            logger.info(`Rewards request from: ${chatId}`);
            break;

          case '/help':
            // Show help
            logger.info(`Help request from: ${chatId}`);
            break;

          default:
            logger.info(`Unknown command from ${chatId}: ${command}`);
        }
      }
    }

    // Telegram expects 200 OK
    res.sendStatus(200);
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    // Still return 200 to prevent Telegram from retrying
    res.sendStatus(200);
  }
});

/**
 * Kaspi Payment Webhook
 * Receives payment notifications from Kaspi POS
 */
router.post('/kaspi', async (req: Request, res: Response) => {
  try {
    logger.info('Kaspi webhook received:', req.body);
    res.json({ success: true, message: 'Payment webhook received' });
  } catch (error) {
    logger.error('Kaspi webhook error:', error);
    res.status(500).json({ success: false, error: 'Internal processing error' });
  }
});

/**
 * Demo POS Endpoint
 * Records a purchase transaction, calculates cashback, and emits real-time events
 */
const demoPosSchema = z.object({
  customerWallet: z.string().min(1),
  amountKzt: z.number().positive(),
  businessWallet: z.string().min(1),
});

router.post('/demo-pos', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = demoPosSchema.parse(req.body);

    // Look up the business partner for tier-based cashback
    const partner = await prisma.partner.findUnique({
      where: { walletAddress: data.businessWallet },
    });
    const tier = partner?.tier || 'BRONZE';
    const cashbackRate = tier === 'GOLD' ? 0.15 : tier === 'SILVER' ? 0.12 : 0.10;
    const cashbackAmount = Math.floor(data.amountKzt * cashbackRate);

    // Record the transaction
    const tx = await prisma.transaction.create({
      data: {
        partnerId: partner?.id || req.user!.id,
        amount: BigInt(data.amountKzt),
        pointsEarned: cashbackAmount,
        type: 'PURCHASE',
        description: `POS purchase ${data.amountKzt} KZT → ${cashbackAmount} SWEET cashback`,
      },
    });

    // Update loyalty points if partner exists
    if (partner) {
      await prisma.loyaltyPoints.upsert({
        where: { partnerId: partner.id },
        update: {
          balance: { increment: BigInt(cashbackAmount) },
          lifetimeEarned: { increment: BigInt(cashbackAmount) },
        },
        create: {
          partnerId: partner.id,
          balance: BigInt(cashbackAmount),
          lifetimeEarned: BigInt(cashbackAmount),
        },
      });
    }

    // Emit real-time event to customer
    io.to(`wallet:${data.customerWallet}`).emit('tokens:received', {
      amount: cashbackAmount,
      message: `+${cashbackAmount} SWEET from ${partner?.companyName || 'partner'}`,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorType: 'partner',
        action: 'MINT_TOKENS',
        entityType: 'transaction',
        entityId: tx.id,
        metadata: { amountKzt: data.amountKzt, cashback: cashbackAmount, tier },
      },
    });

    logger.info(`Demo POS: ${data.amountKzt} KZT → ${cashbackAmount} SWEET for ${data.customerWallet}`);

    res.json({
      success: true,
      data: {
        txId: tx.id,
        amountKzt: data.amountKzt,
        cashback: cashbackAmount,
        cashbackRate,
        tier,
        timestamp: tx.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * TON Blockchain Webhook
 * Receives transaction notifications
 */
router.post('/ton', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;

    logger.info('Received TON event:', event);

    // Process blockchain events
    // This would be called by a TON indexer or monitoring service

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;




