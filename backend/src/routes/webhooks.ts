import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Telegram Bot Webhook
 * Receives updates from Telegram
 */
router.post('/telegram', async (req: Request, res: Response, next: NextFunction) => {
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




