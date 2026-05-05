import { InlineKeyboard } from 'grammy';
import { config } from './config';
import { t, Lang } from './i18n';

/**
 * Main menu keyboard with "Open Mini App" button
 */
export function mainMenuKeyboard(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(t(userId, 'openMiniApp'), config.miniAppUrl)
    .row()
    .text(t(userId, 'balance'), 'action:balance')
    .text(t(userId, 'rewards'), 'action:rewards')
    .row()
    .text(t(userId, 'referral'), 'action:referral')
    .text(t(userId, 'help'), 'action:help');
}

/**
 * Rewards list keyboard with claim buttons
 */
export function rewardsKeyboard(
  rewards: Array<{ id: string; title: string; pointsRequired: string }>,
  userId: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const reward of rewards) {
    keyboard
      .text(
        `${reward.title} — ${reward.pointsRequired} ${t(userId, 'rewardPoints')}`,
        `claim:${reward.id}`
      )
      .row();
  }

  keyboard.webApp(t(userId, 'openMiniApp'), config.miniAppUrl);

  return keyboard;
}

/**
 * Language selection keyboard
 */
export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Русский', 'lang:ru')
    .text('Қазақша', 'lang:kz')
    .text('English', 'lang:en');
}

/**
 * Back to main menu keyboard
 */
export function backToMenuKeyboard(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(t(userId, 'openMiniApp'), config.miniAppUrl);
}
