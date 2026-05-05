import { Context } from 'grammy';
import { t, tReplace } from '../i18n';
import { apiService } from '../services/api';
import { backToMenuKeyboard } from '../keyboards';

/**
 * /balance command handler.
 * Shows user's SWEET token balance.
 */
export async function balanceCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  try {
    const balance = await apiService.getBalance(userId);

    if (!balance) {
      await ctx.reply(t(userId, 'balanceNotFound'), {
        reply_markup: backToMenuKeyboard(userId),
      });
      return;
    }

    const message = [
      `<b>${t(userId, 'balanceInfo')}</b>`,
      '',
      `💰 <b>${balance.balance}</b> SWEET`,
      '',
      `📈 ${t(userId, 'balanceLifetime')}: ${balance.lifetimeEarned} SWEET`,
      `📉 ${t(userId, 'balanceRedeemed')}: ${balance.lifetimeRedeemed} SWEET`,
    ].join('\n');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(userId),
    });
  } catch (error) {
    console.error('[BALANCE] Error fetching balance:', error);
    await ctx.reply(t(userId, 'balanceError'));
  }
}
