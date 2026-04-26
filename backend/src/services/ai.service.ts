import { prisma } from '../utils/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChurnRiskResult {
  partnerId: string;
  companyName: string;
  tier: string;
  riskScore: number; // 0–100
  riskLevel: RiskLevel;
  signals: {
    daysSinceLastTx: number;
    txLast30Days: number;
    txPrev30Days: number;
    frequencyDrop: number; // percentage drop
    balanceRatio: number;  // balance / lifetimeEarned
    recentActivityScore: number; // 0–100
  };
  recommendation: string;
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  isForecasted: boolean;
}

export interface ForecastResult {
  chartData: ForecastPoint[];
  totalForecast30Days: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  confidence: number; // 0–100
  avgDailyRevenue: number;
}

export interface RewardRecommendation {
  rewardId: string;
  title: string;
  category: string;
  pointsRequired: number;
  score: number; // 0–100 relevance
  reason: string;
}

export interface RecommendationResult {
  partnerId: string;
  recommendations: RewardRecommendation[];
  personalizedMessage: string;
}

// ============================================================================
// HELPER: Simple Linear Regression
// ============================================================================

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y ?? 0, r2: 0 };

  const sumX = data.reduce((s, p) => s + p.x, 0);
  const sumY = data.reduce((s, p) => s + p.y, 0);
  const sumXY = data.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = data.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² coefficient of determination
  const yMean = sumY / n;
  const ssTot = data.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssRes = data.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

// ============================================================================
// 1. CHURN RISK PREDICTION
// ============================================================================

export async function computeChurnRisks(partnerIdFilter?: string): Promise<ChurnRiskResult[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const whereClause = partnerIdFilter ? { id: partnerIdFilter } : { status: 'ACTIVE' as const };

  const partners = await prisma.partner.findMany({
    where: whereClause,
    include: {
      loyaltyPoints: true,
      transactions: {
        select: { createdAt: true, pointsEarned: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const results: ChurnRiskResult[] = [];

  for (const partner of partners) {
    const txAll = partner.transactions;
    if (txAll.length === 0) {
      // No transactions at all → critical risk
      results.push({
        partnerId: partner.id,
        companyName: partner.companyName,
        tier: partner.tier,
        riskScore: 95,
        riskLevel: 'CRITICAL',
        signals: {
          daysSinceLastTx: 999,
          txLast30Days: 0,
          txPrev30Days: 0,
          frequencyDrop: 100,
          balanceRatio: 0,
          recentActivityScore: 0,
        },
        recommendation: 'No transactions recorded. Reach out immediately with an onboarding incentive.',
      });
      continue;
    }

    // Days since last transaction
    const lastTxDate = new Date(txAll[0]!.createdAt);
    const daysSinceLastTx = Math.floor((now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24));

    // Transaction frequency: last 30 days vs previous 30 days
    const txLast30 = txAll.filter(t => new Date(t.createdAt) >= thirtyDaysAgo).length;
    const txPrev30 = txAll.filter(t => {
      const d = new Date(t.createdAt);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    const frequencyDrop = txPrev30 === 0
      ? (txLast30 === 0 ? 100 : 0)
      : Math.max(0, ((txPrev30 - txLast30) / txPrev30) * 100);

    // Balance ratio (high un-redeemed balance = possible disengagement)
    const lifetimeEarned = Number(partner.loyaltyPoints?.lifetimeEarned ?? 0n);
    const balance = Number(partner.loyaltyPoints?.balance ?? 0n);
    const balanceRatio = lifetimeEarned === 0 ? 0 : balance / lifetimeEarned;

    // Recent activity score 0–100 (more is better)
    const recentActivityScore = Math.min(100, txLast30 * 10);

    // ── Scoring ──────────────────────────────────────────────────
    let score = 0;

    // Days since last transaction (max 50 pts)
    if (daysSinceLastTx > 90) score += 50;
    else if (daysSinceLastTx > 60) score += 38;
    else if (daysSinceLastTx > 30) score += 22;
    else if (daysSinceLastTx > 14) score += 10;

    // Frequency drop (max 25 pts)
    if (frequencyDrop >= 75) score += 25;
    else if (frequencyDrop >= 50) score += 18;
    else if (frequencyDrop >= 25) score += 10;
    else if (frequencyDrop > 0) score += 4;

    // Balance ratio (max 15 pts) — very high balance means not engaging
    if (balanceRatio > 0.9) score += 15;
    else if (balanceRatio > 0.7) score += 9;
    else if (balanceRatio > 0.5) score += 4;

    // No recent activity (max 10 pts)
    if (txLast30 === 0) score += 10;
    else if (txLast30 <= 2) score += 5;

    score = Math.min(100, Math.round(score));

    const riskLevel: RiskLevel =
      score >= 75 ? 'CRITICAL'
      : score >= 50 ? 'HIGH'
      : score >= 25 ? 'MEDIUM'
      : 'LOW';

    const recommendation = buildChurnRecommendation(riskLevel, daysSinceLastTx, balanceRatio, partner.tier);

    results.push({
      partnerId: partner.id,
      companyName: partner.companyName,
      tier: partner.tier,
      riskScore: score,
      riskLevel,
      signals: {
        daysSinceLastTx,
        txLast30Days: txLast30,
        txPrev30Days: txPrev30,
        frequencyDrop: Math.round(frequencyDrop),
        balanceRatio: Math.round(balanceRatio * 100) / 100,
        recentActivityScore,
      },
      recommendation,
    });
  }

  // Sort by risk score descending
  return results.sort((a, b) => b.riskScore - a.riskScore);
}

function buildChurnRecommendation(
  level: RiskLevel,
  daysSinceLastTx: number,
  balanceRatio: number,
  tier: string
): string {
  if (level === 'CRITICAL') {
    return `Critical: ${daysSinceLastTx} days inactive. Send urgent re-engagement offer with double-points bonus.`;
  }
  if (level === 'HIGH') {
    if (balanceRatio > 0.7) {
      return 'High unused balance — promote a limited-time exclusive reward to trigger redemption.';
    }
    return `Activity dropped sharply. Consider a personalised ${tier === 'GOLD' ? 'VIP' : 'loyalty'} bonus campaign.`;
  }
  if (level === 'MEDIUM') {
    return 'Moderate slowdown. A push notification with a weekend double-points event could re-engage.';
  }
  return 'Engagement is healthy. Keep up the current loyalty programme to maintain retention.';
}

// ============================================================================
// 2. REVENUE FORECAST (30-day linear regression + extrapolation)
// ============================================================================

export async function computeRevenueForecast(partnerIdFilter?: string): Promise<ForecastResult> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(partnerIdFilter && { partnerId: partnerIdFilter }),
      createdAt: { gte: ninetyDaysAgo },
    },
    select: { createdAt: true, amount: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dailyMap: Record<string, number> = {};
  for (const tx of transactions) {
    const key = tx.createdAt.toISOString().split('T')[0]!;
    dailyMap[key] = (dailyMap[key] ?? 0) + Number(tx.amount);
  }

  // Fill all 90 days (missing days = 0)
  const historicalPoints: { x: number; y: number; date: string }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0]!;
    historicalPoints.push({ x: 89 - i, y: dailyMap[key] ?? 0, date: key });
  }

  // Run linear regression on last 90 days
  const regression = linearRegression(historicalPoints.map(p => ({ x: p.x, y: p.y })));

  const avgDailyRevenue =
    historicalPoints.reduce((s, p) => s + p.y, 0) / historicalPoints.length;

  // Build chart data: last 30 historical days + 30 forecasted days
  const chartData: ForecastPoint[] = [];

  // Last 30 actual days
  for (const p of historicalPoints.slice(60)) {
    chartData.push({
      date: p.date,
      actual: p.y,
      predicted: Math.max(0, Math.round(regression.slope * p.x + regression.intercept)),
      isForecasted: false,
    });
  }

  // Next 30 forecasted days
  let totalForecast = 0;
  for (let i = 1; i <= 30; i++) {
    const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const xVal = 89 + i;
    const predicted = Math.max(0, Math.round(regression.slope * xVal + regression.intercept));
    totalForecast += predicted;
    chartData.push({
      date: futureDate.toISOString().split('T')[0]!,
      actual: null,
      predicted,
      isForecasted: true,
    });
  }

  // Trend calculation: compare predicted avg next 30d vs actual avg last 30d
  const actualLast30Avg =
    historicalPoints.slice(60).reduce((s, p) => s + p.y, 0) / 30;
  const forecastAvg = totalForecast / 30;
  const trendPercent =
    actualLast30Avg === 0 ? 0 : ((forecastAvg - actualLast30Avg) / actualLast30Avg) * 100;

  const trend: 'up' | 'down' | 'stable' =
    trendPercent > 3 ? 'up' : trendPercent < -3 ? 'down' : 'stable';

  // Confidence: based on R² and data density (how many non-zero days)
  const nonZeroDays = historicalPoints.filter(p => p.y > 0).length;
  const dataDensity = nonZeroDays / 90;
  const confidence = Math.round(regression.r2 * 60 + dataDensity * 40);

  return {
    chartData,
    totalForecast30Days: totalForecast,
    trend,
    trendPercent: Math.round(trendPercent * 10) / 10,
    confidence: Math.min(99, Math.max(10, confidence)),
    avgDailyRevenue: Math.round(avgDailyRevenue),
  };
}

// ============================================================================
// 3. SMART REWARD RECOMMENDATIONS
// ============================================================================

export async function computeRecommendations(partnerId: string): Promise<RecommendationResult> {
  const [partner, allRewards, claimedRewards] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: partnerId },
      include: { loyaltyPoints: true },
    }),
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { totalClaimed: 'desc' },
    }),
    prisma.claimedReward.findMany({
      where: { partnerId },
      select: { rewardId: true },
    }),
  ]);

  if (!partner) {
    return { partnerId, recommendations: [], personalizedMessage: 'Partner not found.' };
  }

  const balance = Number(partner.loyaltyPoints?.balance ?? 0n);
  const lifetimeEarned = Number(partner.loyaltyPoints?.lifetimeEarned ?? 0n);
  const claimedIds = new Set(claimedRewards.map(c => c.rewardId));
  const maxPopularity = allRewards[0]?.totalClaimed ?? 1;

  const scored: RewardRecommendation[] = [];

  for (const reward of allRewards) {
    const cost = Number(reward.pointsRequired);

    // Base score components (each 0–100)
    let score = 0;
    const reasons: string[] = [];

    // 1. Affordability: can the partner claim it? (30 pts)
    if (balance >= cost) {
      const affordRatio = Math.min(1, balance / (cost * 1.5));
      score += Math.round(affordRatio * 30);
      reasons.push('within your balance');
    } else {
      // Still recommend if close (< 20% away)
      const gap = (cost - balance) / cost;
      if (gap < 0.2) {
        score += 10;
        reasons.push('almost affordable');
      }
    }

    // 2. Popularity: total claims normalised (25 pts)
    const popularityScore = maxPopularity > 0
      ? (reward.totalClaimed / maxPopularity) * 25
      : 0;
    score += Math.round(popularityScore);
    if (reward.totalClaimed > 5) reasons.push('popular choice');

    // 3. Tier relevance (20 pts)
    const tierScore = getTierCategoryScore(partner.tier, reward.category);
    score += tierScore;
    if (tierScore > 10) reasons.push(`great for ${partner.tier.toLowerCase()} tier`);

    // 4. Not yet claimed bonus (15 pts)
    if (!claimedIds.has(reward.id)) {
      score += 15;
      reasons.push('new for you');
    }

    // 5. High engagement reward for active partners (10 pts)
    const recentTxCount = await prisma.transaction.count({
      where: {
        partnerId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentTxCount >= 5 && reward.category === 'SPECIAL') {
      score += 10;
      reasons.push('exclusive for active partners');
    }

    // Penalise out-of-stock
    if (reward.maxClaims > 0 && reward.totalClaimed >= reward.maxClaims) continue;

    scored.push({
      rewardId: reward.id,
      title: reward.title,
      category: reward.category,
      pointsRequired: cost,
      score: Math.min(100, Math.round(score)),
      reason: reasons.slice(0, 2).join(' · ') || 'Recommended for you',
    });
  }

  // Top 3
  const top3 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const personalizedMessage = buildPersonalisedMessage(partner.tier, balance, lifetimeEarned, top3.length);

  return { partnerId, recommendations: top3, personalizedMessage };
}

function getTierCategoryScore(tier: string, category: string): number {
  const matrix: Record<string, Record<string, number>> = {
    GOLD:   { SPECIAL: 20, CASHBACK: 15, DISCOUNT: 10, PRODUCT: 8 },
    SILVER: { CASHBACK: 18, DISCOUNT: 15, PRODUCT: 12, SPECIAL: 8 },
    BRONZE: { DISCOUNT: 20, PRODUCT: 15, CASHBACK: 10, SPECIAL: 5 },
  };
  return matrix[tier]?.[category] ?? 5;
}

function buildPersonalisedMessage(
  tier: string,
  balance: number,
  lifetimeEarned: number,
  recCount: number
): string {
  if (recCount === 0) return 'Earn more points to unlock exclusive rewards!';
  const redemptionRate = lifetimeEarned > 0
    ? Math.round(((lifetimeEarned - balance) / lifetimeEarned) * 100)
    : 0;
  if (tier === 'GOLD') {
    return `As a Gold partner with ${balance.toLocaleString()} SWEET, you qualify for premium rewards. Your redemption rate is ${redemptionRate}%.`;
  }
  if (tier === 'SILVER') {
    return `You have ${balance.toLocaleString()} SWEET ready to use. These picks match your Silver tier benefits.`;
  }
  return `You've earned ${balance.toLocaleString()} SWEET points. Start redeeming to climb to Silver tier!`;
}
