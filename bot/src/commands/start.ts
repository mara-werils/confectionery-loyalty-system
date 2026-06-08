import { Context } from 'grammy';
import { t } from '../i18n';
import { mainMenuKeyboard } from '../keyboards';

/**
 * /start command handler.
 * Sends welcome message with inline keyboard including "Open Mini App" button.
 */
export async function startCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  const welcomeText = `${t(userId, 'welcome')}\n\n${t(userId, 'welcomeDescription')}`;

  await ctx.reply(welcomeText, {
    reply_markup: mainMenuKeyboard(userId),
    parse_mode: 'HTML',
  });
}
