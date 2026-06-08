import { Bot } from 'grammy';
import { tReplace, Lang, setUserLang, getUserLang } from '../i18n';

/**
 * Notification service for sending proactive messages to users.
 * These functions are exported so the backend can call them
 * (e.g., via an HTTP endpoint on the bot, or by importing directly).
 */

let botInstance: Bot | null = null;

/**
 * Initialize notifications with the bot instance.
 * Must be called during bot startup.
 */
export function initNotifications(bot: Bot): void {
  botInstance = bot;
}

/**
 * Send cashback notification to a user after a purchase.
 * @param chatId - Telegram chat ID of the user
 * @param amount - SWEET tokens earned as cashback
 */
export async function sendCashbackNotification(
  chatId: number,
  amount: number
): Promise<void> {
  if (!botInstance) {
    console.error('[NOTIFICATIONS] Bot not initialized');
    return;
  }

  const message = tReplace(chatId, 'notificationCashback', {
    amount: amount.toString(),
  });

  try {
    await botInstance.api.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
    console.log(`[NOTIFICATIONS] Cashback notification sent to ${chatId}: +${amount} SWEET`);
  } catch (error) {
    console.error(`[NOTIFICATIONS] Failed to send cashback notification to ${chatId}:`, error);
  }
}

/**
 * Send coupon expiry reminder to a user.
 * @param chatId - Telegram chat ID of the user
 * @param couponName - Name/title of the coupon
 * @param daysLeft - Days until expiry
 */
export async function sendCouponExpiryReminder(
  chatId: number,
  couponName: string,
  daysLeft: number
): Promise<void> {
  if (!botInstance) {
    console.error('[NOTIFICATIONS] Bot not initialized');
    return;
  }

  const message = tReplace(chatId, 'notificationCouponExpiry', {
    coupon: couponName,
    days: daysLeft.toString(),
  });

  try {
    await botInstance.api.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
    console.log(`[NOTIFICATIONS] Coupon expiry reminder sent to ${chatId}: "${couponName}" (${daysLeft} days)`);
  } catch (error) {
    console.error(`[NOTIFICATIONS] Failed to send coupon expiry reminder to ${chatId}:`, error);
  }
}

/**
 * Send new reward available notification to a user.
 * @param chatId - Telegram chat ID of the user
 * @param rewardTitle - Title of the new reward
 * @param pointsRequired - Points needed to claim the reward
 */
export async function sendNewRewardNotification(
  chatId: number,
  rewardTitle: string,
  pointsRequired: number
): Promise<void> {
  if (!botInstance) {
    console.error('[NOTIFICATIONS] Bot not initialized');
    return;
  }

  const message = tReplace(chatId, 'notificationNewReward', {
    title: rewardTitle,
    points: pointsRequired.toString(),
  });

  try {
    await botInstance.api.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
    console.log(`[NOTIFICATIONS] New reward notification sent to ${chatId}: "${rewardTitle}"`);
  } catch (error) {
    console.error(`[NOTIFICATIONS] Failed to send new reward notification to ${chatId}:`, error);
  }
}

/**
 * Broadcast a message to multiple users (e.g., for promotions).
 * @param chatIds - Array of Telegram chat IDs
 * @param message - HTML-formatted message
 */
export async function broadcastMessage(
  chatIds: number[],
  message: string
): Promise<{ sent: number; failed: number }> {
  if (!botInstance) {
    console.error('[NOTIFICATIONS] Bot not initialized');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const chatId of chatIds) {
    try {
      await botInstance.api.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
      sent++;
      // Rate limiting: max 30 messages per second (Telegram limit)
      await new Promise((resolve) => setTimeout(resolve, 35));
    } catch (error) {
      failed++;
      console.error(`[NOTIFICATIONS] Failed to send broadcast to ${chatId}:`, error);
    }
  }

  console.log(`[NOTIFICATIONS] Broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
