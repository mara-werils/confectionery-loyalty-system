import { BotError, Context } from 'grammy';
import { t } from '../i18n';

/**
 * Global error handler for the bot.
 * Catches all unhandled errors and sends a user-friendly message.
 */
export function errorHandler(err: BotError<Context>): void {
  const ctx = err.ctx;
  const error = err.error;

  console.error(`[BOT ERROR] Update ${ctx.update.update_id} failed:`);
  console.error(error);

  // Try to notify the user about the error
  const userId = ctx.from?.id;
  if (userId) {
    const errorMessage = t(userId, 'errorGeneric');
    ctx.reply(errorMessage).catch((replyError) => {
      console.error('[BOT ERROR] Failed to send error message to user:', replyError);
    });
  }
}
