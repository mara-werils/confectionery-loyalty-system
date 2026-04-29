import { motion } from 'framer-motion';
import {
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  GiftIcon,
  BoltIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAiChurn, useAiForecast, useAiRecommendations } from '../hooks/useApi';

// ─── Types ───────────────────────────────────────────────────────────────────

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ChurnRisk {
  partnerId: string;
  companyName: string;
  tier: string;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: {
    daysSinceLastTx: number;
    txLast30Days: number;
    txPrev30Days: number;
    frequencyDrop: number;
    balanceRatio: number;
    recentActivityScore: number;
  };
  recommendation: string;
}

interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  isForecasted: boolean;
}

interface ForecastData {
  chartData: ForecastPoint[];
  totalForecast30Days: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  confidence: number;
  avgDailyRevenue: number;
}

interface RewardRec {
  rewardId: string;
  title: string;
  category: string;
  pointsRequired: number;
  score: number;
  reason: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string; ring: string }> = {
  LOW:      { label: 'Low Risk',      color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  ring: '#4ade80' },
  MEDIUM:   { label: 'Medium Risk',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', ring: '#facc15' },
  HIGH:     { label: 'High Risk',     color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', ring: '#fb923c' },
  CRITICAL: { label: 'Critical',      color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    ring: '#f87171' },
};

const TIER_BADGE: Record<string, string> = {
  GOLD:   'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  SILVER: 'text-stone-300 bg-stone-400/10 border border-stone-400/20',
  BRONZE: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
};

const CATEGORY_ICON: Record<string, string> = {
  DISCOUNT: '💸',
  PRODUCT: '🎁',
  CASHBACK: '🪙',
  SPECIAL: '★',
};

function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  const circumference = 2 * Math.PI * 28;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#292524" strokeWidth="5" />
        <circle
          cx="32" cy="32" r="28"
          fill="none"
          stroke={cfg.ring}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-black ${cfg.color}`}>{score}</span>
        <span className="text-[9px] text-stone-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// Custom Recharts Tooltip
function ForecastTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-white font-semibold">
          {p.name === 'actual' ? 'Actual' : 'Forecast'}: {Number(p.value).toLocaleString()} KZT
        </p>
      ))}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-800 ${className ?? ''}`} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIPredictions() {
  const { data: churnRaw, isLoading: churnLoading } = useAiChurn();
  const { data: forecastRaw, isLoading: forecastLoading } = useAiForecast();
  const { data: recsRaw, isLoading: recsLoading } = useAiRecommendations();

  const churnData: ChurnRisk[] = (churnRaw as { data: ChurnRisk[] })?.data ?? [];
  const forecast: ForecastData | undefined = (forecastRaw as { data: ForecastData })?.data;
  const recs: RewardRec[] = (recsRaw as { data: { recommendations: RewardRec[] } })?.data?.recommendations ?? [];
  const personalizedMsg: string = (recsRaw as { data: { personalizedMessage: string } })?.data?.personalizedMessage ?? '';

  // Derive counts for summary row
  const criticalCount = churnData.filter(c => c.riskLevel === 'CRITICAL').length;
  const highCount = churnData.filter(c => c.riskLevel === 'HIGH').length;
  const lowCount = churnData.filter(c => c.riskLevel === 'LOW').length;

  // Split forecast into actual vs forecasted for dual-area chart
  const todayStr = new Date().toISOString().split('T')[0]!;
  const chartPoints = forecast?.chartData ?? [];

  return (
    <div className="px-1 py-4 space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Insights</h1>
        </div>
        <p className="text-xs text-stone-500 pl-10">
          Predictive analytics · Updated in real-time
        </p>
      </motion.div>

      {/* ── Summary Row ── */}
      {!churnLoading && churnData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Critical', count: criticalCount, color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/15' },
            { label: 'At Risk', count: highCount, color: 'text-orange-400', bg: 'bg-orange-400/8 border-orange-400/15' },
            { label: 'Healthy', count: lowCount, color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/15' },
          ].map(item => (
            <div key={item.label} className={`border rounded-xl p-3 text-center ${item.bg}`}>
              <p className={`text-2xl font-black ${item.color}`}>{item.count}</p>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Churn Risk Section ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-300">Churn Risk Prediction</h2>
        </div>

        {churnLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : churnData.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center">
            <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No active partners to analyse.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {churnData.map((partner, i) => {
              const cfg = RISK_CONFIG[partner.riskLevel];
              return (
                <motion.div
                  key={partner.partnerId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`bg-stone-900 border ${cfg.border} rounded-xl p-4 space-y-3`}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <RiskGauge score={partner.riskScore} level={partner.riskLevel} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{partner.companyName}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${TIER_BADGE[partner.tier]}`}>
                          {partner.tier}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {/* Signals */}
                      <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1">
                        {[
                          { label: 'Days idle', value: partner.signals.daysSinceLastTx === 999 ? '—' : `${partner.signals.daysSinceLastTx}d` },
                          { label: 'Tx (30d)', value: partner.signals.txLast30Days },
                          { label: 'Freq. drop', value: `${partner.signals.frequencyDrop}%` },
                        ].map(s => (
                          <div key={s.label}>
                            <p className="text-[9px] text-stone-600 uppercase tracking-wide">{s.label}</p>
                            <p className="text-xs font-semibold text-stone-300">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation pill */}
                  <div className={`rounded-lg px-3 py-2 text-xs ${cfg.bg} border ${cfg.border}`}>
                    <span className="text-stone-400">Recommendation: </span>
                    <span className="text-stone-200">{partner.recommendation}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Revenue Forecast Section ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-300">30-Day Revenue Forecast</h2>
        </div>

        {forecastLoading ? (
          <Skeleton className="h-64" />
        ) : !forecast ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center text-stone-500 text-sm">
            Not enough data to generate a forecast yet.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-4"
          >
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-stone-500 uppercase tracking-wide">Forecast Total</p>
                <p className="text-base font-black text-white mt-0.5">
                  {forecast.totalForecast30Days.toLocaleString()} <span className="text-xs font-normal text-stone-500">KZT</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 uppercase tracking-wide">Trend</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {forecast.trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />}
                  {forecast.trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />}
                  {forecast.trend === 'stable' && <MinusIcon className="w-4 h-4 text-yellow-400" />}
                  <span className={`text-sm font-bold ${
                    forecast.trend === 'up' ? 'text-green-400' :
                    forecast.trend === 'down' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {forecast.trend === 'stable' ? '±0%' : `${forecast.trendPercent > 0 ? '+' : ''}${forecast.trendPercent}%`}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 uppercase tracking-wide">Confidence</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                      style={{ width: `${forecast.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-violet-400">{forecast.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#52525b' }}
                    tickFormatter={(v: string) => v.slice(5)}
                    interval={9}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#52525b' }} />
                  <Tooltip content={<ForecastTooltip />} />
                  <ReferenceLine x={todayStr} stroke="#52525b" strokeDasharray="4 4" label={{ value: 'Today', fill: '#71717a', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    fill="url(#actualGrad)"
                    dot={false}
                    connectNulls={false}
                    name="actual"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#34d399"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    fill="url(#forecastGrad)"
                    dot={false}
                    name="predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-violet-400 rounded" />
                <span className="text-[10px] text-stone-500">Actual revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-emerald-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#34d399 0,#34d399 5px,transparent 5px,transparent 8px)' }} />
                <span className="text-[10px] text-stone-500">AI forecast</span>
              </div>
            </div>

            {/* Model note */}
            <p className="text-[10px] text-stone-600 text-center">
              Linear regression model trained on 90 days of transaction data
            </p>
          </motion.div>
        )}
      </section>

      {/* ── Smart Recommendations Section ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GiftIcon className="w-4 h-4 text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-300">Smart Reward Picks</h2>
        </div>

        {recsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <>
            {personalizedMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <BoltIcon className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-300">{personalizedMsg}</p>
                </div>
              </motion.div>
            )}

            {recs.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center text-stone-500 text-sm">
                Earn more points to unlock recommendations.
              </div>
            ) : (
              <div className="space-y-3">
                {recs.map((rec, i) => (
                  <motion.div
                    key={rec.rewardId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-stone-900 border border-stone-800/80 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-xl flex-shrink-0">
                        {CATEGORY_ICON[rec.category] ?? '🎁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white truncate">{rec.title}</p>
                          <span className="text-xs font-bold text-violet-400 flex-shrink-0">
                            {rec.pointsRequired.toLocaleString()} pts
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{rec.reason}</p>
                      </div>
                    </div>

                    {/* Relevance bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] text-stone-600 w-16">Relevance</span>
                      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${rec.score}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-stone-400 w-8 text-right">{rec.score}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}
