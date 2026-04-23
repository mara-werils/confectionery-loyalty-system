import { motion } from 'framer-motion';
import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useAnalyticsSummary } from '../hooks/useApi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const TIER_COLORS: Record<string, string> = {
  GOLD: '#facc15',
  SILVER: '#a1a1aa',
  BRONZE: '#f97316',
};

interface SummaryData {
  totalPartners: number;
  totalTransactions: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  avgPointsPerTransaction: number;
  tierDistribution: Record<string, number>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm"
    >
      <div className="flex justify-between items-start mb-3">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <Icon className="w-4 h-4 text-zinc-600" />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function Stats() {
  const { data: summaryData, isLoading } = useAnalyticsSummary();
  const summary: SummaryData | undefined = (summaryData as { data: SummaryData })?.data;

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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Ecosystem Stats</h1>
        <p className="text-zinc-400 mt-1">Live data from the Sweet Loyalty blockchain</p>
      </motion.div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 h-24 animate-pulse" />
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
              sub="Confectioneries on platform"
              delay={0.05}
            />
            <StatCard
              icon={ChartBarIcon}
              label="Total Transactions"
              value={summary?.totalTransactions?.toLocaleString() ?? '—'}
              sub="All-time processed"
              delay={0.1}
            />
            <StatCard
              icon={SparklesIcon}
              label="SWEET Issued"
              value={summary?.totalPointsIssued?.toLocaleString() ?? '—'}
              sub="Tokens minted on TON"
              delay={0.15}
            />
            <StatCard
              icon={CurrencyDollarIcon}
              label="SWEET Redeemed"
              value={summary?.totalPointsRedeemed?.toLocaleString() ?? '—'}
              sub="Tokens burned/spent"
              delay={0.2}
            />
          </div>

          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-zinc-400">Key Performance Indicators</h2>

            <div className="flex items-center justify-between py-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Redemption Rate</p>
                  <p className="text-xs text-zinc-500">Points redeemed vs issued</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-400">{redemptionRate}%</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Avg Points / Transaction</p>
                  <p className="text-xs text-zinc-500">Loyalty engagement score</p>
                </div>
              </div>
              <span className="text-lg font-bold text-white">
                {summary?.avgPointsPerTransaction?.toFixed(0) ?? '—'}
              </span>
            </div>
          </motion.div>

          {/* Tier Distribution Pie */}
          {tierData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5"
            >
              <h2 className="text-sm font-semibold text-zinc-400 mb-4">Partner Tier Distribution</h2>
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
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
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
                        <span className="text-sm text-zinc-300">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
