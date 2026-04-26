import { prisma } from '../utils/prisma';
import { notificationService } from './notification';
import { logger } from '../utils/logger';
import { mintAchievementNFT } from './nft.service';

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS = {
    FIRST_PURCHASE: {
        code: 'FIRST_PURCHASE',
        name: 'First Steps',
        description: 'Made your first purchase',
        category: 'transactions',
        requirement: 1,
        points: 100,
    },
    TRANSACTIONS_10: {
        code: 'TRANSACTIONS_10',
        name: 'Getting Started',
        description: 'Completed 10 transactions',
        category: 'transactions',
        requirement: 10,
        points: 250,
    },
    TRANSACTIONS_100: {
        code: 'TRANSACTIONS_100',
        name: 'Regular Customer',
        description: 'Completed 100 transactions',
        category: 'transactions',
        requirement: 100,
        points: 1000,
    },
    REFERRER_5: {
        code: 'REFERRER_5',
        name: 'Team Builder',
        description: 'Referred 5 partners',
        category: 'referrals',
        requirement: 5,
        points: 500,
    },
    REFERRER_20: {
        code: 'REFERRER_20',
        name: 'Ambassador',
        description: 'Referred 20 partners',
        category: 'referrals',
        requirement: 20,
        points: 2000,
    },
    POINTS_10000: {
        code: 'POINTS_10000',
        name: 'Point Collector',
        description: 'Earned 10,000 lifetime points',
        category: 'spending',
        requirement: 10000,
        points: 500,
    },
    POINTS_100000: {
        code: 'POINTS_100000',
        name: 'Point Master',
        description: 'Earned 100,000 lifetime points',
        category: 'spending',
        requirement: 100000,
        points: 2500,
    },
    TIER_SILVER: {
        code: 'TIER_SILVER',
        name: 'Silver Status',
        description: 'Reached Silver tier',
        category: 'general',
        requirement: 1,
        points: 300,
    },
    TIER_GOLD: {
        code: 'TIER_GOLD',
        name: 'Gold Status',
        description: 'Reached Gold tier',
        category: 'general',
        requirement: 1,
        points: 1000,
    },
};

/**
 * Achievement Service
 */
class AchievementService {
    /**
     * Initialize default achievements
     */
    async initializeAchievements(): Promise<void> {
        for (const achievement of Object.values(ACHIEVEMENTS)) {
            await prisma.achievement.upsert({
                where: { code: achievement.code },
                update: {},
                create: achievement,
            });
        }
        logger.info('Achievements initialized');
    }

    /**
     * Check and update achievements for a partner
     */
    async checkAchievements(partnerId: string): Promise<string[]> {
        const unlocked: string[] = [];

        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: {
                loyaltyPoints: true,
                _count: {
                    select: {
                        transactions: true,
                        referrals: true,
                    },
                },
            },
        });

        if (!partner) return unlocked;

        const achievements = await prisma.achievement.findMany({
            where: { isActive: true },
        });

        for (const achievement of achievements) {
            // Check if already unlocked
            const existing = await prisma.partnerAchievement.findUnique({
                where: {
                    partnerId_achievementId: {
                        partnerId,
                        achievementId: achievement.id,
                    },
                },
            });

            if (existing?.unlockedAt) continue;

            // Calculate progress based on category
            let progress = 0;
            let shouldUnlock = false;

            switch (achievement.category) {
                case 'transactions':
                    progress = partner._count.transactions;
                    shouldUnlock = progress >= achievement.requirement;
                    break;
                case 'referrals':
                    progress = partner._count.referrals;
                    shouldUnlock = progress >= achievement.requirement;
                    break;
                case 'spending':
                    progress = Number(partner.loyaltyPoints?.lifetimeEarned || 0n);
                    shouldUnlock = progress >= achievement.requirement;
                    break;
                case 'general':
                    if (achievement.code === 'TIER_SILVER' && partner.tier === 'SILVER') {
                        progress = 1;
                        shouldUnlock = true;
                    } else if (achievement.code === 'TIER_GOLD' && partner.tier === 'GOLD') {
                        progress = 1;
                        shouldUnlock = true;
                    }
                    break;
            }

            // Update or create progress
            await prisma.partnerAchievement.upsert({
                where: {
                    partnerId_achievementId: {
                        partnerId,
                        achievementId: achievement.id,
                    },
                },
                update: {
                    progress,
                    unlockedAt: shouldUnlock && !existing?.unlockedAt ? new Date() : undefined,
                },
                create: {
                    partnerId,
                    achievementId: achievement.id,
                    progress,
                    unlockedAt: shouldUnlock ? new Date() : undefined,
                },
            });

            // Award points + mint NFT if just unlocked
            if (shouldUnlock && !existing?.unlockedAt) {
                if (achievement.points > 0) {
                    await prisma.loyaltyPoints.update({
                        where: { partnerId },
                        data: {
                            balance: { increment: BigInt(achievement.points) },
                            lifetimeEarned: { increment: BigInt(achievement.points) },
                        },
                    });
                }

                unlocked.push(achievement.name);

                // ── Mint SBT achievement NFT on TON testnet ───────────────────
                if (partner.walletAddress) {
                    mintAchievementNFT({
                        ownerWalletAddress: partner.walletAddress,
                        achievementCode:    achievement.code,
                        achievementName:    achievement.name,
                    }).then(async (nftResult) => {
                        if (nftResult) {
                            await prisma.partnerAchievement.update({
                                where: {
                                    partnerId_achievementId: {
                                        partnerId,
                                        achievementId: achievement.id,
                                    },
                                },
                                data: { nftTxHash: nftResult.txHash },
                            });
                            logger.info(
                                `NFT minted for ${partner.companyName ?? partnerId} ` +
                                `| achievement=${achievement.code} ` +
                                `| simulated=${nftResult.isSimulated} ` +
                                `| tx=${nftResult.txHash}`
                            );
                        }
                    }).catch(err => {
                        logger.error('NFT mint fire-and-forget error:', err);
                    });
                }

                // Send Telegram notification
                await notificationService.notifyAchievementUnlocked(
                    partnerId,
                    achievement.name
                );
            }
        }

        return unlocked;
    }

    /**
     * Get all achievements for a partner
     */
    async getPartnerAchievements(partnerId: string) {
        const achievements = await prisma.achievement.findMany({
            where: { isActive: true },
            include: {
                partnerAchievements: {
                    where: { partnerId },
                },
            },
            orderBy: { category: 'asc' },
        });

        return achievements.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            description: a.description,
            imageUrl: a.imageUrl,
            category: a.category,
            requirement: a.requirement,
            points: a.points,
            progress: a.partnerAchievements[0]?.progress || 0,
            unlockedAt: a.partnerAchievements[0]?.unlockedAt,
            nftTxHash: a.partnerAchievements[0]?.nftTxHash,
        }));
    }
}

export const achievementService = new AchievementService();
