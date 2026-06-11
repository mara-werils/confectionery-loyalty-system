/**
 * ML Churn Auto-Intervention Cron Job
 *
 * Runs every 24 hours (and once on startup for demo purposes).
 * Computes churn risk scores for all active partners and automatically
 * sends bonus SWEET tokens to partners at HIGH / CRITICAL risk.
 *
 * Risk thresholds:
 *   CRITICAL (≥75): send 150 SWEET bonus
 *   HIGH     (≥50): send  50 SWEET bonus
 */

import { prisma } from '../utils/prisma';
import { computeChurnRisks } from '../services/ai.service';
import { logger } from '../utils/logger';
import { io } from '../index';
import { checkAndFinalizeProposal } from '../routes/governance';

const INTERVENTION_BONUS: Record<string, number> = {
  CRITICAL: 150,
  HIGH: 50,
};

// Track last run to avoid double-sending in the same UTC day
let lastRunDate = '';

export async function runChurnIntervention(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!;
  if (lastRunDate === today) {
    logger.debug('[ChurnCron] Already ran today, skipping');
    return;
  }
  lastRunDate = today;

  logger.info('[ChurnCron] Starting daily churn analysis...');

  try {
    const risks = await computeChurnRisks(); // all active partners

    let interventionCount = 0;

    for (const risk of risks) {
      const bonus = INTERVENTION_BONUS[risk.riskLevel];
      if (!bonus) continue; // LOW / MEDIUM → no automatic action

      // Check if already intervened today for this partner
      const alreadyDone = await prisma.churnIntervention.findFirst({
        where: {
          partnerId: risk.partnerId,
          createdAt: { gte: new Date(today + 'T00:00:00.000Z') },
        },
      });
      if (alreadyDone) continue;

      // Credit bonus SWEET tokens
      await prisma.$transaction([
        prisma.loyaltyPoints.upsert({
          where: { partnerId: risk.partnerId },
          update: {
            balance: { increment: BigInt(bonus) },
            lifetimeEarned: { increment: BigInt(bonus) },
          },
          create: {
            partnerId: risk.partnerId,
            balance: BigInt(bonus),
            lifetimeEarned: BigInt(bonus),
          },
        }),
        prisma.churnIntervention.create({
          data: {
            partnerId: risk.partnerId,
            riskScore: risk.riskScore,
            riskLevel: risk.riskLevel,
            bonusSent: bonus,
          },
        }),
      ]);

      // Emit real-time event to both the partner's room and the public feed
      const eventPayload = {
        type: 'churn_intervention',
        partnerId: risk.partnerId,
        companyName: risk.companyName,
        riskLevel: risk.riskLevel,
        riskScore: risk.riskScore,
        bonusSent: bonus,
        message: `AI saved ${risk.companyName} from churn — sent ${bonus} SWEET`,
        timestamp: new Date().toISOString(),
      };

      io.to(`partner:${risk.partnerId}`).emit('churn:intervention', eventPayload);
      io.emit('pulse:intervention', eventPayload);
      io.emit('activity:new', { type: 'intervention', ...eventPayload });

      interventionCount++;
      logger.info(`[ChurnCron] Intervention: ${risk.companyName} (${risk.riskLevel}, score=${risk.riskScore}) → +${bonus} SWEET`);
    }

    logger.info(`[ChurnCron] Done. Intervened for ${interventionCount} partner(s).`);

    // Also finalize any expired governance proposals
    const expiredProposals = await prisma.proposal.findMany({
      where: { status: 'ACTIVE', votingEndsAt: { lt: new Date() } },
      select: { id: true },
    });
    for (const p of expiredProposals) {
      await checkAndFinalizeProposal(p.id);
    }

  } catch (err) {
    logger.error('[ChurnCron] Error during churn intervention:', err);
  }
}

/** Start the cron schedule (every 24h at midnight UTC) */
export function startChurnCron(): void {
  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  };

  // Run immediately on startup (for demo: so committee sees live interventions)
  setTimeout(() => {
    runChurnIntervention().catch(err => logger.error('[ChurnCron] Startup run failed:', err));
  }, 5000); // 5s delay to let DB connect

  // Schedule daily at midnight UTC
  const scheduleNext = () => {
    setTimeout(() => {
      runChurnIntervention()
        .catch(err => logger.error('[ChurnCron] Scheduled run failed:', err))
        .finally(scheduleNext);
    }, msUntilMidnight());
  };
  scheduleNext();

  logger.info('[ChurnCron] Scheduled daily churn intervention (next run at midnight UTC)');
}
