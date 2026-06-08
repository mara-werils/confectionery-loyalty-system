import { Context, NextFunction } from 'grammy';

/**
 * Determine the update type from the update object.
 */
function getUpdateType(ctx: Context): string {
  if (ctx.message) return 'message';
  if (ctx.callbackQuery) return 'callback_query';
  if (ctx.inlineQuery) return 'inline_query';
  if (ctx.editedMessage) return 'edited_message';
  if (ctx.channelPost) return 'channel_post';
  return 'unknown';
}

/**
 * Logging middleware — logs every incoming update.
 */
export async function loggerMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const start = Date.now();
  const userId = ctx.from?.id || 'unknown';
  const username = ctx.from?.username || 'no_username';
  const updateType = getUpdateType(ctx);

  let details = '';
  if (ctx.message?.text) {
    details = `text="${ctx.message.text}"`;
  } else if (ctx.callbackQuery?.data) {
    details = `callback="${ctx.callbackQuery.data}"`;
  }

  console.log(`[BOT] <-- ${updateType} from ${userId} (@${username}) ${details}`);

  await next();

  const duration = Date.now() - start;
  console.log(`[BOT] --> ${updateType} from ${userId} processed in ${duration}ms`);
}
