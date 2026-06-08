import { Bot } from 'grammy';
import { logger } from '../utils/logger.js';

export async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const miniAppUrl = process.env.MINI_APP_URL || 'https://confectionery-loyalty-system-fronte.vercel.app/customer/dashboard';

  const bot = new Bot(token);

  // /start command
  bot.command('start', async (ctx) => {
    const name = ctx.from?.first_name || 'друг';
    await ctx.reply(
      `Привет, ${name}! 👋\n\nЯ — бот системы лояльности Sweet.\n\nОткройте мини-приложение, чтобы:\n• Проверить баланс SWEET\n• Получить награды\n• Отслеживать кэшбэк\n• Управлять рефералами`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍬 Открыть Sweet App', web_app: { url: miniAppUrl } }],
            [
              { text: '💰 Баланс', callback_data: 'balance' },
              { text: '🎁 Награды', callback_data: 'rewards' },
            ],
            [
              { text: '👥 Реферал', callback_data: 'referral' },
              { text: '❓ Помощь', callback_data: 'help' },
            ],
          ],
        },
      }
    );
  });

  // /balance command
  bot.command('balance', async (ctx) => {
    await ctx.reply(
      '💰 Чтобы проверить баланс, откройте мини-приложение:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍬 Открыть Sweet App', web_app: { url: miniAppUrl } }],
          ],
        },
      }
    );
  });

  // /rewards command
  bot.command('rewards', async (ctx) => {
    await ctx.reply(
      '🎁 Каталог наград доступен в мини-приложении:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍬 Открыть каталог наград', web_app: { url: miniAppUrl } }],
          ],
        },
      }
    );
  });

  // /referral command
  bot.command('referral', async (ctx) => {
    await ctx.reply(
      '👥 Реферальная программа\n\nПриглашайте партнёров и получайте 500 SWEET за каждого!\nОткройте приложение для управления рефералами:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍬 Открыть рефералы', web_app: { url: miniAppUrl } }],
          ],
        },
      }
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `<b>Доступные команды:</b>\n\n/start — Начать работу\n/balance — Баланс SWEET\n/rewards — Каталог наград\n/referral — Реферальная программа\n/help — Эта справка\n\nИли просто нажмите кнопку ниже:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍬 Открыть Sweet App', web_app: { url: miniAppUrl } }],
          ],
        },
      }
    );
  });

  // Callback queries
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery();

    switch (data) {
      case 'balance':
        await ctx.reply('💰 Откройте приложение для просмотра баланса:', {
          reply_markup: {
            inline_keyboard: [[{ text: '🍬 Открыть Sweet App', web_app: { url: miniAppUrl } }]],
          },
        });
        break;
      case 'rewards':
        await ctx.reply('🎁 Откройте каталог наград:', {
          reply_markup: {
            inline_keyboard: [[{ text: '🍬 Открыть каталог', web_app: { url: miniAppUrl } }]],
          },
        });
        break;
      case 'referral':
        await ctx.reply('👥 Управляйте рефералами в приложении:', {
          reply_markup: {
            inline_keyboard: [[{ text: '🍬 Открыть рефералы', web_app: { url: miniAppUrl } }]],
          },
        });
        break;
      case 'help':
        await ctx.reply(
          `/start — Начать\n/balance — Баланс\n/rewards — Награды\n/referral — Рефералы\n/help — Справка`
        );
        break;
    }
  });

  // Set commands in Telegram menu
  await bot.api.setMyCommands([
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'balance', description: 'Проверить баланс SWEET' },
    { command: 'rewards', description: 'Доступные награды' },
    { command: 'referral', description: 'Реферальная программа' },
    { command: 'help', description: 'Показать справку' },
  ]).catch(() => {});

  // Error handling
  bot.catch((err) => {
    logger.error('[BOT] Error:', err);
  });

  // Start polling
  bot.start();
  logger.info('[BOT] Telegram bot started successfully');
}
