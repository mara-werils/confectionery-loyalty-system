import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  WarningIcon,
  CheckCircleIcon,
  TrendUpIcon,
  TrendDownIcon,
  MinusIcon,
  GiftIcon,
  LightningIcon,
  ChartBarIcon,
  BrainIcon,
  ShieldCheckIcon,
  FileTextIcon,
  ShieldWarningIcon,
  SpinnerGapIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react';
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
import { useQuery } from '@tanstack/react-query';
import { useAiChurn, useAiForecast, useAiRecommendations } from '../hooks/useApi';
import { api } from '../services/api';

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
  LOW:      { label: 'Низкий',    color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  ring: '#4ade80' },
  MEDIUM:   { label: 'Средний',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', ring: '#facc15' },
  HIGH:     { label: 'Высокий',   color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', ring: '#fb923c' },
  CRITICAL: { label: 'Критический', color: 'text-red-400',  bg: 'bg-red-400/10',    border: 'border-red-400/20',    ring: '#f87171' },
};

const TIER_BADGE: Record<string, string> = {
  GOLD:   'text-amber-400 bg-amber-400/10 border border-amber-400/20',
  SILVER: 'text-stone-500 bg-stone-400/10 border border-stone-400/20',
  BRONZE: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
};

const CATEGORY_ICON: Record<string, string> = {
  DISCOUNT: '%',
  PRODUCT: '·',
  CASHBACK: '↩',
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
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
      <p className="mb-1" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: 'var(--sweet-text)' }}>
          {p.name === 'actual' ? 'Факт' : 'Прогноз'}: {Number(p.value).toLocaleString()} KZT
        </p>
      ))}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className ?? ''}`} style={{ background: 'var(--sweet-border)' }} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIPredictions() {
  const { t } = useTranslation();
  const { data: churnRaw, isLoading: churnLoading } = useAiChurn();
  const { data: forecastRaw, isLoading: forecastLoading } = useAiForecast();
  const { data: recsRaw, isLoading: recsLoading } = useAiRecommendations();
  const { data: interventionsRaw } = useQuery({
    queryKey: ['ai', 'interventions'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (api.churn.getInterventions({ limit: 5 }) as any).then((r: any) => r.data ?? r),
    refetchInterval: 30000,
  });

  const churnData: ChurnRisk[] = (churnRaw as { data: ChurnRisk[] })?.data ?? [];
  const forecast: ForecastData | undefined = (forecastRaw as { data: ForecastData })?.data;
  const recs: RewardRec[] = (recsRaw as { data: { recommendations: RewardRec[] } })?.data?.recommendations ?? [];
  const personalizedMsg: string = (recsRaw as { data: { personalizedMessage: string } })?.data?.personalizedMessage ?? '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interventions: any = (interventionsRaw as any) ?? null;

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
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>{t('ai.title')}</h1>
        <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('ai.subtitle')}
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
            { label: t('ai.critical'), count: criticalCount, color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/15' },
            { label: t('ai.atRisk'), count: highCount, color: 'text-orange-400', bg: 'bg-orange-400/8 border-orange-400/15' },
            { label: t('ai.healthy'), count: lowCount, color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/15' },
          ].map(item => (
            <div key={item.label} className={`border rounded-xl p-3 text-center ${item.bg}`}>
              <p className={`text-2xl font-black ${item.color}`}>{item.count}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{item.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── AI Auto-Interventions Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(251,113,133,0.08) 0%, var(--sweet-card) 60%)',
          border: '1px solid rgba(251,113,133,0.22)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon className="w-5 h-5" style={{ color: '#fb7185' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
              AI Auto-Interventions
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(251,113,133,0.15)', color: '#fb7185' }}>
              Today: {interventions?.todayCount ?? 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Saved Today', value: interventions?.todayCount ?? 0, color: '#fb7185' },
            { label: 'SWEET Sent', value: interventions?.totalBonusSentToday ?? 0, color: '#f59e0b' },
            { label: 'All-Time Saves', value: interventions?.totalCount ?? 0, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
              <p className="text-xl font-black" style={{ color: s.color }}>
                {s.value.toLocaleString()}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {interventions?.recent && interventions.recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--sweet-text-faint)' }}>
              Recent Auto-Interventions
            </p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {interventions.recent.slice(0, 3).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#fb7185' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--sweet-text)' }}>{item.company}</p>
                    <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                      Risk {item.riskScore}/100 · {item.riskLevel}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                  +{item.bonusSent} SWEET
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
          ML model runs daily · Automatically sends SWEET bonuses to at-risk partners · No human action required
        </p>
      </motion.div>

      {/* ── Churn Risk Section ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <WarningIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{t('ai.churnTitle')}</h2>
        </div>

        {churnLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : churnData.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
            <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--sweet-text-secondary)' }}>{t('ai.noPartners')}</p>
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
                  className={`border ${cfg.border} rounded-xl p-4 space-y-3`} style={{ background: 'var(--sweet-card)' }}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <RiskGauge score={partner.riskScore} level={partner.riskLevel} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--sweet-text)' }}>{partner.companyName}</p>
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
                          { label: 'Неактивен', value: partner.signals.daysSinceLastTx === 999 ? '—' : `${partner.signals.daysSinceLastTx}д` },
                          { label: 'Тр. (30д)', value: partner.signals.txLast30Days },
                          { label: 'Спад част.', value: `${partner.signals.frequencyDrop}%` },
                        ].map(s => (
                          <div key={s.label}>
                            <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--sweet-text-faint)' }}>{s.label}</p>
                            <p className="text-xs font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation pill */}
                  <div className={`rounded-lg px-3 py-2 text-xs ${cfg.bg} border ${cfg.border}`}>
                    <span style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.recommendation')}: </span>
                    <span style={{ color: 'var(--sweet-text)' }}>{partner.recommendation}</span>
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
          <ChartBarIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{t('ai.forecastTitle')}</h2>
        </div>

        {forecastLoading ? (
          <Skeleton className="h-64" />
        ) : !forecast ? (
          <div className="rounded-xl p-6 text-center text-sm" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}>
            {t('ai.noForecastData')}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-4 space-y-4" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.forecast')}</p>
                <p className="text-base font-black mt-0.5" style={{ color: 'var(--sweet-text)' }}>
                  {forecast.totalForecast30Days.toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--sweet-text-muted)' }}>KZT</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.trend')}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {forecast.trend === 'up' && <TrendUpIcon className="w-4 h-4 text-green-400" />}
                  {forecast.trend === 'down' && <TrendDownIcon className="w-4 h-4 text-red-400" />}
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
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.confidence')}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sweet-border)' }}>
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${forecast.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-amber-400">{forecast.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#78716c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#78716c" stopOpacity={0} />
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
                  <ReferenceLine x={todayStr} stroke="#52525b" strokeDasharray="4 4" label={{ value: 'Сегодня', fill: '#71717a', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#actualGrad)"
                    dot={false}
                    connectNulls={false}
                    name="actual"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#78716c"
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
                <div className="w-4 h-0.5 bg-amber-400 rounded" />
                <span className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.actualRevenue')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded" style={{ background: '#78716c', backgroundImage: 'repeating-linear-gradient(90deg,#78716c 0,#78716c 5px,transparent 5px,transparent 8px)' }} />
                <span className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>{t('ai.aiForecast')}</span>
              </div>
            </div>

            {/* Model note */}
            <p className="text-[10px] text-center" style={{ color: 'var(--sweet-text-faint)' }}>
              {t('ai.modelNote')}
            </p>
          </motion.div>
        )}
      </section>

      {/* ── Smart Recommendations Section ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GiftIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{t('ai.recsTitle')}</h2>
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
                className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <LightningIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600">{personalizedMsg}</p>
                </div>
              </motion.div>
            )}

            {recs.length === 0 ? (
              <div className="rounded-xl p-6 text-center text-sm" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}>
                {t('ai.noRecs')}
              </div>
            ) : (
              <div className="space-y-3">
                {recs.map((rec, i) => (
                  <motion.div
                    key={rec.rewardId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl p-4" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--sweet-border)' }}>
                        {CATEGORY_ICON[rec.category] ?? '🎁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--sweet-text)' }}>{rec.title}</p>
                          <span className="text-xs font-bold text-amber-400 flex-shrink-0">
                            {rec.pointsRequired.toLocaleString()} pts
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{rec.reason}</p>
                      </div>
                    </div>

                    {/* Relevance bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] w-16" style={{ color: 'var(--sweet-text-faint)' }}>{t('ai.relevance')}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sweet-border)' }}>
                        <motion.div
                          className="h-full bg-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${rec.score}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: 'var(--sweet-text-secondary)' }}>{rec.score}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── AI BI Report Section ── */}
      <AIReportSection />

      {/* ── AI Anomaly Detection Section ── */}
      <AIAnomalySection />

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}

// ─── Severity helpers ──────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  HIGH:     { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.25)' },
  MEDIUM:   { color: '#facc15', bg: 'rgba(250,204,21,0.10)',  border: 'rgba(250,204,21,0.25)' },
  LOW:      { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',   border: 'rgba(74,222,128,0.25)' },
  NONE:     { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',   border: 'rgba(74,222,128,0.25)' },
};

const ANOMALY_TYPE_LABEL: Record<string, string> = {
  POINT_FARMING: 'Фарминг баллов',
  SPIKE: 'Всплеск активности',
  OUTLIER: 'Аномальная сумма',
  DUPLICATE: 'Дублирование',
  TIMING: 'Подозрительное время',
  TIER_ABUSE: 'Злоупотребление уровнем',
};

// ─── AI BI Report Component ───────────────────────────────────────────────

function AIReportSection() {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.ai.generateReport();
      const data = res.data?.data ?? res.data;
      setReport(data.report);
      setGeneratedAt(data.generatedAt);
    } catch {
      setReport('Ошибка генерации отчёта. Убедитесь что Claude CLI настроен на сервере.');
    }
    setLoading(false);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileTextIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
            AI Бизнес-отчёт
          </h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerate}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            background: 'var(--sweet-accent)',
            color: '#0d0b0a',
            border: 'none',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <SpinnerGapIcon className="w-3.5 h-3.5 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <BrainIcon className="w-3.5 h-3.5" />
              Сгенерировать
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {loading && !report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 text-center space-y-3"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <div className="flex justify-center">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
                border: '2px solid rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SpinnerGapIcon className="w-6 h-6 animate-spin" style={{ color: 'var(--sweet-accent)' }} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>
              Claude AI анализирует данные экосистемы...
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
              Сбор метрик → Анализ трендов → Генерация отчёта
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            {/* Report header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
              <div className="flex items-center gap-2">
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BrainIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: 'var(--sweet-text)' }}>
                    Сгенерировано Claude AI
                  </p>
                  {generatedAt && (
                    <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
                      {new Date(generatedAt).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  const blob = new Blob([report], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sweet-loyalty-report-${new Date().toISOString().split('T')[0]}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                  background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)',
                  color: 'var(--sweet-text-muted)', cursor: 'pointer',
                }}
              >
                <DownloadSimpleIcon className="w-3 h-3" />
                .md
              </motion.button>
            </div>

            {/* Report body — rendered as styled text */}
            <div
              className="px-5 py-4 prose prose-sm prose-invert max-w-none"
              style={{
                fontSize: 12,
                lineHeight: 1.7,
                color: 'var(--sweet-text-secondary)',
              }}
            >
              <MarkdownRenderer content={report} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!report && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
          <FileTextIcon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sweet-text-faint)' }} />
          <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
            Нажмите «Сгенерировать» для создания AI-отчёта за неделю
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--sweet-text-faint)' }}>
            Claude AI проанализирует все метрики и создаст детальный отчёт
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Simple Markdown Renderer ──────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 15, fontWeight: 800, color: 'var(--sweet-text)', margin: '20px 0 8px' }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--sweet-text)', margin: '16px 0 6px' }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: 17, fontWeight: 900, color: 'var(--sweet-text)', margin: '0 0 12px' }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'var(--sweet-accent)', fontWeight: 800 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)![1];
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'var(--sweet-accent)', fontWeight: 800, minWidth: 16 }}>{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^\d+\.\s/, '')) }} />
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <p key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: boldify(line) }} />
      );
    }
  }

  return <>{elements}</>;
}

function boldify(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--sweet-text); font-weight: 700;">$1</strong>')
    .replace(/`(.*?)`/g, '<code style="background: var(--sweet-input); padding: 1px 5px; border-radius: 4px; font-size: 11px;">$1</code>');
}

// ─── AI Anomaly Detection Component ──────────────────────────────────────

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  partner: string;
  description: string;
  evidence: string;
  recommendation: string;
}

interface AnomalyResult {
  anomalies: Anomaly[];
  summary: string;
  riskLevel: string;
  analyzedCount: number;
  stats: { avgAmount: number; maxAmount: number; stdDev: number };
  generatedAt: string;
}

function AIAnomalySection() {
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.ai.detectAnomalies();
      const data = res.data?.data ?? res.data;
      setResult(data);
    } catch {
      setResult({
        anomalies: [],
        summary: 'Ошибка анализа. Убедитесь что Claude CLI настроен на сервере.',
        riskLevel: 'NONE',
        analyzedCount: 0,
        stats: { avgAmount: 0, maxAmount: 0, stdDev: 0 },
        generatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  const riskCfg = SEVERITY_CONFIG[result?.riskLevel ?? 'NONE'] ?? SEVERITY_CONFIG.NONE;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldWarningIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
            AI Детектор аномалий
          </h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleScan}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            background: loading ? 'var(--sweet-input)' : 'rgba(248,113,113,0.15)',
            color: loading ? 'var(--sweet-text-muted)' : '#f87171',
            border: `1px solid ${loading ? 'var(--sweet-border)' : 'rgba(248,113,113,0.3)'}`,
          }}
        >
          {loading ? (
            <>
              <SpinnerGapIcon className="w-3.5 h-3.5 animate-spin" />
              Сканирование...
            </>
          ) : (
            <>
              <ShieldWarningIcon className="w-3.5 h-3.5" />
              Запустить скан
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {loading && !result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 text-center space-y-3"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <div className="flex justify-center">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(248,113,113,0.10)',
                border: '2px solid rgba(248,113,113,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SpinnerGapIcon className="w-6 h-6 animate-spin" style={{ color: '#f87171' }} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>
              Claude AI сканирует транзакции за 48 часов...
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
              Статистический анализ → Поиск паттернов → Оценка рисков
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Summary card */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: `linear-gradient(135deg, ${riskCfg.bg} 0%, var(--sweet-card) 60%)`,
                border: `1px solid ${riskCfg.border}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5" style={{ color: riskCfg.color }} />
                  <span className="text-xs font-bold" style={{ color: riskCfg.color }}>
                    Уровень риска: {result.riskLevel}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                  Проанализировано: {result.analyzedCount} транзакций
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--sweet-text-secondary)', lineHeight: 1.6 }}>
                {result.summary}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Средняя сумма', value: `${result.stats.avgAmount.toLocaleString()} ₸` },
                  { label: 'Макс. сумма', value: `${result.stats.maxAmount.toLocaleString()} ₸` },
                  { label: 'Аномалий', value: result.anomalies.length, color: result.anomalies.length > 0 ? '#f87171' : '#4ade80' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 text-center"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
                    <p className="text-sm font-black" style={{ color: s.color ?? 'var(--sweet-text)' }}>
                      {s.value}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly cards */}
            {result.anomalies.length > 0 && (
              <div className="space-y-2">
                {result.anomalies.map((anomaly, i) => {
                  const cfg = SEVERITY_CONFIG[anomaly.severity] ?? SEVERITY_CONFIG.LOW;
                  return (
                    <motion.div
                      key={anomaly.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-xl p-4 space-y-2"
                      style={{ background: 'var(--sweet-card)', border: `1px solid ${cfg.border}` }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold" style={{ color: cfg.color }}>
                            {anomaly.id}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {anomaly.severity}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--sweet-input)', color: 'var(--sweet-text-muted)', border: '1px solid var(--sweet-border)' }}>
                            {ANOMALY_TYPE_LABEL[anomaly.type] ?? anomaly.type}
                          </span>
                        </div>
                      </div>

                      {/* Partner */}
                      <p className="text-xs font-semibold" style={{ color: 'var(--sweet-text)' }}>
                        {anomaly.partner}
                      </p>

                      {/* Description */}
                      <p className="text-xs" style={{ color: 'var(--sweet-text-secondary)', lineHeight: 1.5 }}>
                        {anomaly.description}
                      </p>

                      {/* Evidence */}
                      <div className="rounded-lg px-3 py-2" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                          Доказательство: <span style={{ color: 'var(--sweet-text-muted)' }}>{anomaly.evidence}</span>
                        </p>
                      </div>

                      {/* Recommendation */}
                      <div className="rounded-lg px-3 py-2" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <p className="text-[10px]" style={{ color: cfg.color }}>
                          Рекомендация: <span style={{ color: 'var(--sweet-text-secondary)' }}>{anomaly.recommendation}</span>
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Timestamp */}
            <p className="text-[10px] text-center" style={{ color: 'var(--sweet-text-faint)' }}>
              Анализ выполнен Claude AI · {new Date(result.generatedAt).toLocaleString('ru-RU')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
          <ShieldWarningIcon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sweet-text-faint)' }} />
          <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
            Нажмите «Запустить скан» для анализа транзакций за 48 часов
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--sweet-text-faint)' }}>
            Claude AI проверит фарминг баллов, всплески, дубликаты и подозрительные паттерны
          </p>
        </div>
      )}
    </section>
  );
}
