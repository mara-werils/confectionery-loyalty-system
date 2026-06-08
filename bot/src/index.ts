import { config, validateConfig } from './config';
import { createBot } from './bot';

async function main(): Promise<void> {
  console.log('[BOT] Starting Sweet Loyalty Bot...');

  // Validate environment configuration
  validateConfig();

  // Create and start the bot
  const bot = createBot();

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[BOT] Received ${signal}. Shutting down gracefully...`);
    bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start polling
  await bot.start({
    onStart: (botInfo) => {
      console.log(`[BOT] Bot @${botInfo.username} started successfully!`);
      console.log(`[BOT] API URL: ${config.apiUrl}`);
      console.log(`[BOT] Mini App URL: ${config.miniAppUrl}`);
    },
  });
}

main().catch((error) => {
  console.error('[BOT] Fatal error:', error);
  process.exit(1);
});

// Export notifications for external use (e.g., backend can import these)
export {
  sendCashbackNotification,
  sendCouponExpiryReminder,
  sendNewRewardNotification,
  broadcastMessage,
} from './notifications';

export { createBot } from './bot';
