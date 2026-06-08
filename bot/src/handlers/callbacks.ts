import { Context } from 'grammy';
import { setUserLang, t, tReplace, Lang } from '../i18n';
import { apiService } from '../services/api';
import { mainMenuKeyboard, backToMenuKeyboard } from '../keyboards';
import { balanceCommand } from '../commands/balance';
import { rewardsCommand } from '../commands/rewards';
import { referralCommand } from '../commands/referral';
import { helpCommand } from '../commands/help';

/**
 * Handle inline keyboard button presses.
 */
export async function handleCallbackQuery(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const userId = ctx.from!.id;

  // Acknowledge callback immediately
  await ctx.answerCallbackQuery();

  // Route based on callback data prefix
  if (data.startsWith('action:')) {
    await handleAction(ctx, data.replace('action:', ''));
  } else if (data.startsWith('claim:')) {
    await handleClaimReward(ctx, data.replace('claim:', ''));
  } else if (data.startsWith('lang:')) {
    await handleLanguageChange(ctx, data.replace('lang:', '') as Lang);
  }
}

/**
 * Handle menu action buttons (balance, rewards, referral, help).
 */
async function handleAction(ctx: Context, action: string): Promise<void> {
  switch (action) {
    case 'balance':
      await balanceCommand(ctx);
      break;
    case 'rewards':
      await rewardsCommand(ctx);
      break;
    case 'referral':
      await referralCommand(ctx);
      break;
    case 'help':
      await helpCommand(ctx);
      break;
    default:
      break;
  }
}

/**
 * Handle reward claim button press.
 */
async function handleClaimReward(ctx: Context, rewardId: string): Promise<void> {
  const userId = ctx.from!.id;

  try {
    const result = await apiService.claimReward(userId, rewardId);

    const message = tReplace(userId, 'rewardClaimSuccess', {
      balance: result.newBalance,
    });

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(userId),
    });
  } catch (error: any) {
    console.error('[CLAIM] Error claiming reward:', error);

    const errorCode = error.response?.data?.code;

    if (errorCode === 'INSUFFICIENT_POINTS') {
      await ctx.reply(t(userId, 'rewardInsufficientPoints'));
    } else if (errorCode === 'UNAUTHORIZED' || errorCode === 'ACCOUNT_INVALID') {
      await ctx.reply(t(userId, 'errorUnauthorized'), {
        reply_markup: backToMenuKeyboard(userId),
      });
    } else {
      await ctx.reply(t(userId, 'rewardClaimError'));
    }
  }
}

/**
 * Handle language change.
 */
async function handleLanguageChange(ctx: Context, lang: Lang): Promise<void> {
  const userId = ctx.from!.id;

  setUserLang(userId, lang);

  await ctx.reply(t(userId, 'langSwitched'), {
    reply_markup: mainMenuKeyboard(userId),
  });
}
