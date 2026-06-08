import { Context } from 'grammy';
import { t } from '../i18n';
import { apiService } from '../services/api';
import { rewardsKeyboard, backToMenuKeyboard } from '../keyboards';

/**
 * /rewards command handler.
 * Shows top 3 available rewards with claim buttons.
 */
export async function rewardsCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  try {
    const { data: rewards, total } = await apiService.getRewards(3);

    if (!rewards || rewards.length === 0) {
      await ctx.reply(t(userId, 'rewardsEmpty'), {
        reply_markup: backToMenuKeyboard(userId),
      });
      return;
    }

    let message = `<b>${t(userId, 'rewardsTitle')}</b>\n\n`;

    rewards.forEach((reward, index) => {
      const categoryEmoji = getCategoryEmoji(reward.category);
      message += `${index + 1}. ${categoryEmoji} <b>${reward.title}</b>\n`;
      if (reward.description) {
        message += `   ${reward.description}\n`;
      }
      message += `   💎 ${reward.pointsRequired} ${t(userId, 'rewardPoints')}`;
      message += ` | ${t(userId, 'availableLabel')}: ${reward.available}\n\n`;
    });

    if (total > 3) {
      message += `\n...и ещё ${total - 3} наград в приложении`;
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: rewardsKeyboard(rewards, userId),
    });
  } catch (error) {
    console.error('[REWARDS] Error fetching rewards:', error);
    await ctx.reply(t(userId, 'rewardsError'));
  }
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'DISCOUNT':
      return '🏷';
    case 'PRODUCT':
      return '🎁';
    case 'CASHBACK':
      return '💸';
    case 'SPECIAL':
      return '⭐';
    default:
      return '🎯';
  }
}
