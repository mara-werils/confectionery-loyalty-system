import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { successResponse } from '../utils/response';
import { prisma } from '../utils/prisma';
import {
  computeChurnRisks,
  computeRevenueForecast,
  computeRecommendations,
} from '../services/ai.service';
import { askClaude, askClaudeJSON } from '../services/claude.service';

const router = Router();

// Language for AI-generated text, driven by the UI locale sent from the frontend
const AI_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  en: 'English',
  kz: 'Kazakh',
};

function resolveAiLang(body: unknown): { code: string; name: string } {
  const code = String((body as { lang?: string })?.lang ?? 'ru');
  return AI_LANG_NAME[code] ? { code, name: AI_LANG_NAME[code] } : { code: 'ru', name: 'Russian' };
}

/**
 * @swagger
 * /ai/churn:
 *   get:
 *     summary: Churn risk prediction for partners
 *     description: >
 *       Returns a churn risk score (0–100) and risk level for each active partner.
 *       Admins see all partners; partners see only their own score.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Churn risk scores
 */
router.get(
  '/churn',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.type === 'admin';
      const partnerIdFilter = isAdmin ? undefined : req.user!.id;
      const results = await computeChurnRisks(partnerIdFilter);
      return successResponse(res, results);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /ai/forecast:
 *   get:
 *     summary: 30-day revenue forecast using linear regression
 *     description: >
 *       Analyses the last 90 days of transaction data and produces a 30-day
 *       forecast using linear regression. Returns chart-ready data points,
 *       trend direction, and R²-based confidence score.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue forecast data
 */
router.get(
  '/forecast',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.type === 'admin';
      const partnerIdFilter = isAdmin ? undefined : req.user!.id;
      const result = await computeRevenueForecast(partnerIdFilter);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /ai/recommendations:
 *   get:
 *     summary: Personalised reward recommendations
 *     description: >
 *       Returns the top 3 reward recommendations for the authenticated partner,
 *       scored by affordability, popularity, tier relevance, and novelty.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reward recommendations
 */
router.get(
  '/recommendations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.type !== 'partner') {
        return successResponse(res, { recommendations: [], personalizedMessage: 'Available for partners only.' });
      }
      const result = await computeRecommendations(req.user!.id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /ai/interventions — today's auto-intervention stats
 */
router.get(
  '/interventions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setUTCHours(0, 0, 0, 0);

      const [todayInterventions, totalInterventions, recentInterventions] = await Promise.all([
        prisma.churnIntervention.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.churnIntervention.count(),
        prisma.churnIntervention.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { partner: { select: { companyName: true, tier: true } } },
        }),
      ]);

      const totalBonusSentToday = await prisma.churnIntervention.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { bonusSent: true },
      });

      return successResponse(res, {
        todayCount: todayInterventions,
        totalCount: totalInterventions,
        totalBonusSentToday: totalBonusSentToday._sum.bonusSent ?? 0,
        recent: recentInterventions.map(i => ({
          id: i.id,
          company: i.partner.companyName,
          tier: i.partner.tier,
          riskScore: i.riskScore,
          riskLevel: i.riskLevel,
          bonusSent: i.bonusSent,
          createdAt: i.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// ============================================================================
// 5. AI WEEKLY BI REPORT (Claude Code CLI)
// ============================================================================

/**
 * @swagger
 * /ai/report:
 *   post:
 *     summary: Generate AI-powered weekly business intelligence report
 *     description: >
 *       Collects all ecosystem metrics (partners, revenue, churn, tokens,
 *       rewards) and sends them to Claude AI for a comprehensive narrative
 *       business report in Markdown format.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Generated BI report
 */
router.post(
  '/report',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const aiLang = resolveAiLang(req.body);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Gather all metrics in parallel
      const [
        totalPartners,
        activePartners,
        newPartnersThisWeek,
        txThisWeek,
        txLastWeek,
        totalTokensIssued,
        totalTokensRedeemed,
        rewardsClaimedThisWeek,
        topPartners,
        churnRisks,
        revenueThisWeek,
        revenueLastWeek,
      ] = await Promise.all([
        prisma.partner.count(),
        prisma.partner.count({ where: { status: 'ACTIVE' } }),
        prisma.partner.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.transaction.count({
          where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        }),
        prisma.transaction.aggregate({
          where: { createdAt: { gte: sevenDaysAgo } },
          _sum: { pointsEarned: true },
        }),
        prisma.claimedReward.count({ where: { createdAt: { gte: sevenDaysAgo } } }).then(c => ({ _sum: { pointsEarned: c } })),
        prisma.claimedReward.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.partner.findMany({
          where: { status: 'ACTIVE' },
          include: { loyaltyPoints: true, transactions: { where: { createdAt: { gte: sevenDaysAgo } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        computeChurnRisks(),
        prisma.transaction.aggregate({
          where: { createdAt: { gte: sevenDaysAgo } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          _sum: { amount: true },
        }),
      ]);

      const criticalChurn = churnRisks.filter(c => c.riskLevel === 'CRITICAL').length;
      const highChurn = churnRisks.filter(c => c.riskLevel === 'HIGH').length;

      const metrics = {
        period: `${sevenDaysAgo.toISOString().split('T')[0]} — ${now.toISOString().split('T')[0]}`,
        partners: { total: totalPartners, active: activePartners, newThisWeek: newPartnersThisWeek },
        transactions: {
          thisWeek: txThisWeek,
          lastWeek: txLastWeek,
          changePercent: txLastWeek > 0 ? Math.round(((txThisWeek - txLastWeek) / txLastWeek) * 100) : 0,
        },
        revenue: {
          thisWeekKZT: Number(revenueThisWeek._sum.amount ?? 0),
          lastWeekKZT: Number(revenueLastWeek._sum.amount ?? 0),
        },
        tokens: {
          issuedThisWeek: Number(totalTokensIssued._sum.pointsEarned ?? 0),
          redeemedThisWeek: Math.abs(Number(totalTokensRedeemed._sum.pointsEarned ?? 0)),
        },
        rewards: { claimedThisWeek: rewardsClaimedThisWeek },
        churnRisk: { critical: criticalChurn, high: highChurn, total: churnRisks.length },
        topPartners: topPartners.map(p => ({
          name: p.companyName,
          tier: p.tier,
          txCount: p.transactions.length,
          balance: Number(p.loyaltyPoints?.balance ?? 0),
        })),
      };

      const prompt = `You are a senior business analyst for "Sweet Loyalty" — a blockchain-based loyalty platform for confectioneries in Kazakhstan. Generate a professional weekly business intelligence report based on the following metrics.

DATA:
${JSON.stringify(metrics, null, 2)}

REQUIREMENTS:
- Write the entire report in ${aiLang.name} language (including all section titles)
- Use Markdown formatting with headers (##), bold, and bullet points
- Structure: Executive Summary → Partners → Revenue & Transactions → SWEET Tokenomics → Churn Risks → Recommendations for next week (translate these section titles into ${aiLang.name})
- Include specific numbers and percentage changes
- Be concise but insightful — highlight what's important
- Add 2-3 actionable recommendations at the end
- Do NOT wrap the output in a code block`;

      const report = await askClaude(prompt, {
        timeout: 90_000,
        systemPrompt: 'You are a business intelligence analyst. Return only the Markdown report, no extra commentary.',
      });

      return successResponse(res, {
        report,
        metrics,
        generatedAt: now.toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// ============================================================================
// 6. AI TRANSACTION ANOMALY DETECTION (Claude Code CLI)
// ============================================================================

/**
 * @swagger
 * /ai/anomalies:
 *   post:
 *     summary: Detect anomalies in recent transactions using AI
 *     description: >
 *       Analyses the last 48 hours of transactions and flags suspicious
 *       patterns: point farming, unusual spikes, duplicate transactions,
 *       and potential fraud — with natural language explanations.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Anomaly detection results
 */
router.post(
  '/anomalies',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const aiLang = resolveAiLang(req.body);
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get recent transactions with partner details
      const transactions = await prisma.transaction.findMany({
        where: { createdAt: { gte: twoDaysAgo } },
        include: {
          partner: { select: { companyName: true, tier: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      if (transactions.length === 0) {
        const NO_TX_SUMMARY: Record<string, string> = {
          ru: 'Нет транзакций за последние 48 часов для анализа.',
          en: 'No transactions in the last 48 hours to analyze.',
          kz: 'Соңғы 48 сағатта талдауға транзакциялар жоқ.',
        };
        return successResponse(res, {
          anomalies: [],
          summary: NO_TX_SUMMARY[aiLang.code] ?? NO_TX_SUMMARY.ru,
          riskLevel: 'NONE',
          analyzedCount: 0,
          stats: { avgAmount: 0, maxAmount: 0, stdDev: 0 },
          timeRange: { from: twoDaysAgo.toISOString(), to: now.toISOString() },
          generatedAt: now.toISOString(),
        });
      }

      // Pre-compute statistical signals for Claude
      const partnerTxCounts: Record<string, number> = {};
      const hourlyVolume: Record<string, number> = {};
      const amounts: number[] = [];

      for (const tx of transactions) {
        const pName = tx.partner?.companyName ?? tx.partnerId;
        partnerTxCounts[pName] = (partnerTxCounts[pName] ?? 0) + 1;

        const hour = new Date(tx.createdAt).toISOString().slice(0, 13);
        hourlyVolume[hour] = (hourlyVolume[hour] ?? 0) + 1;

        amounts.push(Number(tx.amount));
      }

      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);
      const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + (a - avgAmount) ** 2, 0) / amounts.length);

      const txSample = transactions.slice(0, 100).map(tx => ({
        id: tx.id.slice(0, 8),
        partner: tx.partner?.companyName ?? 'Unknown',
        tier: tx.partner?.tier ?? 'N/A',
        type: tx.type,
        amount: Number(tx.amount),
        points: Number(tx.pointsEarned),
        time: tx.createdAt.toISOString(),
      }));

      const prompt = `You are a fraud detection analyst for "Sweet Loyalty" — a blockchain-based confectionery loyalty system. Analyze these transactions for anomalies.

STATISTICAL OVERVIEW:
- Total transactions (48h): ${transactions.length}
- Average amount: ${Math.round(avgAmount)} KZT
- Max amount: ${maxAmount} KZT
- Standard deviation: ${Math.round(stdDev)} KZT
- Transactions per partner: ${JSON.stringify(partnerTxCounts)}
- Hourly volume: ${JSON.stringify(hourlyVolume)}

TRANSACTION SAMPLE (latest 100):
${JSON.stringify(txSample, null, 2)}

DETECT THESE PATTERNS:
1. Point farming — same partner making many small transactions to accumulate points
2. Unusual spikes — abnormal transaction volume in a short time window
3. Amount outliers — transactions > 3 standard deviations from mean
4. Duplicate patterns — same amount repeated many times from same partner
5. Suspicious timing — burst of transactions at unusual hours
6. Tier abuse — Bronze partner with unusually high transaction volume

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "anomalies": [
    {
      "id": "string — short anomaly ID like ANM-001",
      "type": "POINT_FARMING | SPIKE | OUTLIER | DUPLICATE | TIMING | TIER_ABUSE",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "partner": "partner name",
      "description": "1-2 sentence explanation in ${aiLang.name}",
      "evidence": "specific numbers/data supporting the finding",
      "recommendation": "what to do about it in ${aiLang.name}"
    }
  ],
  "summary": "2-3 sentence overall assessment in ${aiLang.name}",
  "riskLevel": "NONE | LOW | MEDIUM | HIGH | CRITICAL"
}`;

      const result = await askClaudeJSON<{
        anomalies: Array<{
          id: string;
          type: string;
          severity: string;
          partner: string;
          description: string;
          evidence: string;
          recommendation: string;
        }>;
        summary: string;
        riskLevel: string;
      }>(prompt, {
        timeout: 90_000,
        systemPrompt: 'You are a fraud detection system. Return ONLY valid JSON, no markdown.',
      });

      return successResponse(res, {
        ...result,
        analyzedCount: transactions.length,
        timeRange: { from: twoDaysAgo.toISOString(), to: now.toISOString() },
        stats: { avgAmount: Math.round(avgAmount), maxAmount, stdDev: Math.round(stdDev) },
        generatedAt: now.toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
