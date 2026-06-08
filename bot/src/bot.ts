import { Bot } from 'grammy';
import { config } from './config';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import {
  startCommand,
  balanceCommand,
  rewardsCommand,
  referralCommand,
  helpCommand,
  langCommand,
} from './commands';
import { handleCallbackQuery } from './handlers';
import { initNotifications } from './notifications';

/**
 * Create and configure the bot instance.
 */
export function createBot(): Bot {
  const bot = new Bot(config.botToken);

  // Initialize notifications with bot instance
  initNotifications(bot);

  // Register middleware
  bot.use(loggerMiddleware);

  // Register command handlers
  bot.command('start', startCommand);
  bot.command('balance', balanceCommand);
  bot.command('rewards', rewardsCommand);
  bot.command('referral', referralCommand);
  bot.command('help', helpCommand);
  bot.command('lang', langCommand);

  // Register callback query handler
  bot.on('callback_query:data', handleCallbackQuery);

  // Set bot commands menu (shown in Telegram UI)
  bot.api.setMyCommands([
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'balance', description: 'Проверить баланс SWEET' },
    { command: 'rewards', description: 'Доступные награды' },
    { command: 'referral', description: 'Реферальная программа' },
    { command: 'lang', description: 'Сменить язык' },
    { command: 'help', description: 'Показать справку' },
  ]).catch((err) => {
    console.warn('[BOT] Failed to set bot commands:', err.message);
  });

  // Register error handler
  bot.catch(errorHandler);

  return bot;
}
