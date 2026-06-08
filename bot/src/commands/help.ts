import { Context } from 'grammy';
import { t } from '../i18n';
import { mainMenuKeyboard } from '../keyboards';

/**
 * /help command handler.
 * Lists available commands.
 */
export async function helpCommand(ctx: Context): Promise<void> {
  const userId = ctx.from!.id;

  const message = [
    `<b>${t(userId, 'helpTitle')}</b>`,
    '',
    t(userId, 'helpCommands'),
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(userId),
  });
}
