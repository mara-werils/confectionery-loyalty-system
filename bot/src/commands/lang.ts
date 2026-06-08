import { Context } from 'grammy';
import { t } from '../i18n';
import { languageKeyboard } from '../keyboards';

/**
 * /lang command handler.
 * Shows language selection keyboard.
 */
export async function langCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  await ctx.reply(t(userId, 'chooseLanguage'), {
    reply_markup: languageKeyboard(),
  });
}
