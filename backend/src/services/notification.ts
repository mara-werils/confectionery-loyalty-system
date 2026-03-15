import { logger } from '../utils/logger';

interface TelegramMessage {
    chatId: string | number;
    text: string;
    parseMode?: 'HTML' | 'Markdown';
}

interface EmailMessage {
    to: string;
    subject: string;
    body: string;
}

/**
 * Notification templates
 */
export const NotificationTemplates = {
    POINTS_EARNED: (points: number, balance: number) => ({
        title: '🎉 Points Earned!',
        body: `You earned ${points} points! Your new balance: ${balance} points.`,
    }),

    REWARD_CLAIMED: (rewardName: string) => ({
        title: '🎁 Reward Claimed!',
        body: `You successfully claimed: ${rewardName}`,
    }),

    TIER_UPGRADE: (newTier: string) => ({
        title: '🚀 Tier Upgrade!',
        body: `Congratulations! You've been upgraded to ${newTier} tier!`,
    }),

    PARTNER_APPROVED: () => ({
        title: '✅ Account Approved!',
        body: 'Your partner registration has been approved. Welcome aboard!',
    }),

    REFERRAL_BONUS: (points: number, referredName: string) => ({
        title: '👥 Referral Bonus!',
        body: `${referredName} joined using your referral! You earned ${points} bonus points.`,
    }),

    ACHIEVEMENT_UNLOCKED: (achievementName: string) => ({
        title: '🏆 Achievement Unlocked!',
        body: `You unlocked: ${achievementName}`,
    }),
};

/**
 * Notification Service
 */
class NotificationService {
    private telegramBotToken: string | null = null;

    constructor() {
        this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || null;
    }

    /**
     * Send Telegram notification
     */
    async sendTelegram(message: TelegramMessage): Promise<boolean> {
        if (!this.telegramBotToken) {
            logger.warn('Telegram bot token not configured');
            return false;
        }

        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: message.chatId,
                        text: message.text,
                        parse_mode: message.parseMode || 'HTML',
                    }),
                }
            );

            if (!response.ok) {
                logger.error('Failed to send Telegram notification', { status: response.status });
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Telegram notification error', { error });
            return false;
        }
    }

    /**
     * Send WebSocket notification (real-time)
     */
    async sendRealtime(partnerId: string, event: string, data: object): Promise<void> {
        try {
            // Import io dynamically to avoid circular deps
            const { io } = await import('../index.js');
            io.to(`partner:${partnerId}`).emit(event, data);
        } catch (error) {
            logger.error('Realtime notification error', { error });
        }
    }

    /**
     * Notify partner of points earned
     */
    async notifyPointsEarned(
        partnerId: string,
        points: number,
        balance: number,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.POINTS_EARNED(points, balance);

        // Real-time notification
        await this.sendRealtime(partnerId, 'points:earned', {
            points,
            balance,
            message: template.body,
        });

        // Telegram notification
        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }

    /**
     * Notify partner of reward claimed
     */
    async notifyRewardClaimed(
        partnerId: string,
        rewardName: string,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.REWARD_CLAIMED(rewardName);

        await this.sendRealtime(partnerId, 'reward:claimed', {
            rewardName,
            message: template.body,
        });

        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }

    /**
     * Notify partner of tier upgrade
     */
    async notifyTierUpgrade(
        partnerId: string,
        newTier: string,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.TIER_UPGRADE(newTier);

        await this.sendRealtime(partnerId, 'tier:upgrade', {
            newTier,
            message: template.body,
        });

        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }

    /**
     * Notify partner of account approval
     */
    async notifyPartnerApproved(
        partnerId: string,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.PARTNER_APPROVED();

        await this.sendRealtime(partnerId, 'partner:approved', {
            message: template.body,
        });

        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }

    /**
     * Notify partner of referral bonus
     */
    async notifyReferralBonus(
        partnerId: string,
        points: number,
        referredName: string,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.REFERRAL_BONUS(points, referredName);

        await this.sendRealtime(partnerId, 'referral:bonus', {
            points,
            referredName,
            message: template.body,
        });

        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }

    /**
     * Notify partner of achievement
     */
    async notifyAchievementUnlocked(
        partnerId: string,
        achievementName: string,
        telegramChatId?: string
    ): Promise<void> {
        const template = NotificationTemplates.ACHIEVEMENT_UNLOCKED(achievementName);

        await this.sendRealtime(partnerId, 'achievement:unlocked', {
            achievementName,
            message: template.body,
        });

        if (telegramChatId) {
            await this.sendTelegram({
                chatId: telegramChatId,
                text: `<b>${template.title}</b>\n\n${template.body}`,
            });
        }
    }
}

export const notificationService = new NotificationService();
