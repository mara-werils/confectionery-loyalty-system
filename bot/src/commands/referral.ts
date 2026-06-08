import { Context } from 'grammy';
import { t, tReplace } from '../i18n';
import { apiService } from '../services/api';
import { backToMenuKeyboard } from '../keyboards';

/**
 * /referral command handler.
 * Shows user's referral code and stats, or generates a new code.
 */
export async function referralCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  try {
    let stats = await apiService.getReferralStats(userId);

    if (!stats) {
      await ctx.reply(t(userId, 'errorUnauthorized'), {
        reply_markup: backToMenuKeyboard(userId),
      });
      return;
    }

    // If no referral code exists, generate one
    if (!stats.referralCode) {
      await ctx.reply(t(userId, 'referralGenerating'));
      const result = await apiService.generateReferralCode(userId);
      stats = { ...stats, referralCode: result.referralCode };
    }

    const message = [
      `<b>${t(userId, 'referralTitle')}</b>`,
      '',
      tReplace(userId, 'referralCode', { code: stats.referralCode! }),
      '',
      t(userId, 'referralShare'),
      '',
      `📊 <b>${t(userId, 'referralStats')}:</b>`,
      tReplace(userId, 'referralCount', { count: stats.totalReferrals.toString() }),
      tReplace(userId, 'referralBonus', { bonus: stats.totalBonusEarned }),
    ].join('\n');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(userId),
    });
  } catch (error) {
    console.error('[REFERRAL] Error:', error);
    await ctx.reply(t(userId, 'referralError'));
  }
}
