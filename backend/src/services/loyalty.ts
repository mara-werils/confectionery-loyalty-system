import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';

/**
 * Calculate points earned from transaction amount
 * @param amount - Transaction amount in KZT
 * @param multiplier - Tier multiplier (1.0, 1.5, or 2.0)
 * @returns Points earned
 */
export function calculatePoints(amount: number, multiplier: number): number {
  // Base rate: 1 KZT = 1 point
  const basePoints = Math.floor(amount);
  const finalPoints = Math.floor(basePoints * multiplier);
  return finalPoints;
}

/**
 * Get tier multiplier
 */
export function getTierMultiplier(tier: 'BRONZE' | 'SILVER' | 'GOLD'): number {
  const multipliers = {
    BRONZE: 1.0,
    SILVER: 1.5,
    GOLD: 2.0,
  };
  return multipliers[tier];
}

/**
 * Award bonus points to partner
 */
export async function awardBonusPoints(
  partnerId: string,
  points: number,
  reason: string
): Promise<void> {
  try {
    const [transaction, updatedPoints] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          partnerId,
          amount: 0n,
          pointsEarned: BigInt(points),
          type: 'BONUS',
          description: reason,
        },
      }),
      prisma.loyaltyPoints.update({
        where: { partnerId },
        data: {
          balance: { increment: BigInt(points) },
          lifetimeEarned: { increment: BigInt(points) },
        },
      }),
    ]);

    // Emit real-time update
    io.to(`partner:${partnerId}`).emit('bonus:received', {
      points: points.toString(),
      reason,
      newBalance: updatedPoints.balance.toString(),
    });

    logger.info(`Awarded ${points} bonus points to partner ${partnerId}: ${reason}`);
  } catch (error) {
    logger.error('Failed to award bonus points:', error);
    throw error;
  }
}

/**
 * Process referral bonus
 */
export async function processReferralBonus(
  referrerId: string,
  newPartnerId: string
): Promise<void> {
  const REFERRAL_BONUS = 500;

  try {
    await awardBonusPoints(
      referrerId,
      REFERRAL_BONUS,
      `Referral bonus for inviting new partner`
    );

    logger.info(`Processed referral bonus: ${referrerId} referred ${newPartnerId}`);
  } catch (error) {
    logger.error('Failed to process referral bonus:', error);
    throw error;
  }
}

/**
 * Check and process tier upgrade
 */
export async function checkTierUpgrade(partnerId: string): Promise<boolean> {
  const SILVER_THRESHOLD = 10000n;
  const GOLD_THRESHOLD = 50000n;

  try {
    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({
      where: { partnerId },
      include: { partner: true },
    });

    if (!loyaltyPoints) return false;

    let newTier: 'BRONZE' | 'SILVER' | 'GOLD' | null = null;

    if (
      loyaltyPoints.lifetimeEarned >= GOLD_THRESHOLD &&
      loyaltyPoints.partner.tier !== 'GOLD'
    ) {
      newTier = 'GOLD';
    } else if (
      loyaltyPoints.lifetimeEarned >= SILVER_THRESHOLD &&
      loyaltyPoints.partner.tier === 'BRONZE'
    ) {
      newTier = 'SILVER';
    }

    if (newTier) {
      await prisma.partner.update({
        where: { id: partnerId },
        data: { tier: newTier },
      });

      // Emit tier upgrade event
      io.to(`partner:${partnerId}`).emit('tier:upgraded', {
        oldTier: loyaltyPoints.partner.tier,
        newTier,
      });

      logger.info(`Partner ${partnerId} upgraded to ${newTier}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check tier upgrade:', error);
    throw error;
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<
  Array<{
    rank: number;
    partnerId: string;
    companyName: string;
    lifetimeEarned: string;
    tier: string;
  }>
> {
  const topPartners = await prisma.loyaltyPoints.findMany({
    take: limit,
    orderBy: { lifetimeEarned: 'desc' },
    include: {
      partner: {
        select: {
          id: true,
          companyName: true,
          tier: true,
        },
      },
    },
  });

  return topPartners.map((lp, index) => ({
    rank: index + 1,
    partnerId: lp.partner.id,
    companyName: lp.partner.companyName,
    lifetimeEarned: lp.lifetimeEarned.toString(),
    tier: lp.partner.tier,
  }));
}




