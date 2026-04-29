import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useAnalyticsSummary, useTopPartners } from '../hooks/useApi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const TIER_COLORS: Record<string, string> = {
  GOLD: '#facc15',
  SILVER: '#a1a1aa',
  BRONZE: '#f97316',
};

const TIER_BADGE: Record<string, string> = {
  GOLD: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  SILVER: 'text-stone-300 bg-stone-400/10 border border-stone-400/20',
  BRONZE: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
};

interface SummaryData {
  totalPartners: number;
  activePartners: number;
  totalTransactions: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  avgPointsPerTransaction: number;
  tierDistribution: Record<string, number>;
  growth?: {
    transactions: number | null;
    partners: number | null;
    pointsIssued: number | null;
  };
}

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
        isPositive
          ? 'text-green-400 bg-green-400/10'
          : 'text-red-400 bg-red-400/10'
      }`}
    >
      {isPositive ? (
        <ArrowUpIcon className="w-3 h-3" />
      ) : (
        <ArrowDownIcon className="w-3 h-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  growth,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  growth?: number | null;
}) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <p className="text-xs text-stone-400 font-medium">{label}</p>
        <Icon className="w-4 h-4 text-stone-600" />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-stone-500">{sub}</p>}
        <GrowthBadge value={growth} />
      </div>
    </div>
  );
}

export default function Stats() {
  const { data: summaryData, isLoading } = useAnalyticsSummary();
  const { data: topPartnersData, isLoading: topLoading } = useTopPartners();

  const summary: SummaryData | undefined = (summaryData as { data: SummaryData })?.data;

  const topPartners: {
    rank: number;
    companyName: string;
    tier: string;
    pointsIssued: string;
  }[] = (topPartnersData as { data: typeof topPartners })?.data || [];

  const tierData = summary?.tierDistribution
    ? Object.entries(summary.tierDistribution).map(([name, value]) => ({ name, value }))
    : [];

  const redemptionRate =
    summary && summary.totalPointsIssued > 0
      ? ((summary.totalPointsRedeemed / summary.totalPointsIssued) * 100).toFixed(1)
      : '0';

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="pl-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Ecosystem Stats</h1>
        <p className="text-stone-400 mt-1">Live data from the Sweet Loyalty blockchain</p>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-stone-900 border border-stone-800/80 rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={BuildingStorefrontIcon}
              label="Active Partners"
              value={summary?.totalPartners?.toLocaleString() ?? '—'}
              sub="Confectioneries"
              growth={summary?.growth?.partners}
            />
            <StatCard
              icon={ChartBarIcon}
              label="Total Transactions"
              value={summary?.totalTransactions?.toLocaleString() ?? '—'}
              sub="All-time"
              growth={summary?.growth?.transactions}
            />
            <StatCard
              icon={SparklesIcon}
              label="SWEET Issued"
              value={summary?.totalPointsIssued?.toLocaleString() ?? '—'}
              sub="Tokens minted"
              growth={summary?.growth?.pointsIssued}
            />
            <StatCard
              icon={CurrencyDollarIcon}
              label="SWEET Redeemed"
              value={summary?.totalPointsRedeemed?.toLocaleString() ?? '—'}
              sub="Tokens burned"
            />
          </div>

          {/* KPIs */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-400">Key Performance Indicators</h2>

            <div className="flex items-center justify-between py-3 border-b border-stone-800/60">
              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Redemption Rate</p>
                  <p className="text-xs text-stone-500">Points redeemed vs issued</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-400">{redemptionRate}%</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Avg Points / Transaction</p>
                  <p className="text-xs text-stone-500">Loyalty engagement score</p>
                </div>
              </div>
              <span className="text-lg font-bold text-white">
                {summary?.avgPointsPerTransaction?.toFixed(0) ?? '—'}
              </span>
            </div>
          </div>

          {/* Tier Distribution Pie */}
          {tierData.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-stone-400 mb-4">Partner Tier Distribution</h2>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        dataKey="value"
                        stroke="none"
                      >
                        {tierData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={TIER_COLORS[entry.name] || '#71717a'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1c1917',
                          border: '1px solid #292524',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {tierData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: TIER_COLORS[entry.name] || '#71717a' }}
                        />
                        <span className="text-sm text-stone-300">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Partners Leaderboard */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-400 mb-4">
              Weekly Leaders
              <span className="ml-2 text-xs text-stone-600 font-normal">by SWEET issued</span>
            </h2>
            {topLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-stone-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topPartners.length > 0 ? (
              <div className="space-y-2">
                {topPartners.map((p) => (
                  <div
                    key={p.rank}
                    className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-stone-800/50 transition-colors"
                  >
                    <span className={`w-6 text-center text-sm font-bold ${
                      p.rank === 1 ? 'text-yellow-400' :
                      p.rank === 2 ? 'text-stone-300' :
                      p.rank === 3 ? 'text-orange-400' : 'text-stone-500'
                    }`}>
                      {p.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.companyName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[p.tier] || 'text-stone-400'}`}>
                      {p.tier}
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {Number(p.pointsIssued).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-stone-600 text-sm py-4">No activity this week</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
