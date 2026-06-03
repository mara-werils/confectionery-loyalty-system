import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------
type Period = '7d' | '30d' | '90d' | 'all';

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

function generateRevenueData(days: number) {
  const data: { date: string; revenue: number; prevRevenue: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 45000 + Math.sin(i * 0.4) * 15000 + Math.random() * 12000;
    const prev = 38000 + Math.sin(i * 0.35) * 13000 + Math.random() * 10000;
    data.push({
      date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      revenue: Math.round(base),
      prevRevenue: Math.round(prev),
    });
  }
  return data;
}

const kpiData: Record<Period, { revenue: number; revenueTrend: number; clients: number; clientsTrend: number; avgCheck: number; avgCheckTrend: number; rewardConversion: number; rewardConversionTrend: number }> = {
  '7d': { revenue: 487200, revenueTrend: 12.4, clients: 34, clientsTrend: 8.2, avgCheck: 3420, avgCheckTrend: 5.1, rewardConversion: 68, rewardConversionTrend: 3.7 },
  '30d': { revenue: 1843500, revenueTrend: 9.8, clients: 128, clientsTrend: 15.3, avgCheck: 3180, avgCheckTrend: -2.1, rewardConversion: 72, rewardConversionTrend: 6.2 },
  '90d': { revenue: 5290800, revenueTrend: 18.2, clients: 412, clientsTrend: 22.7, avgCheck: 3350, avgCheckTrend: 1.4, rewardConversion: 65, rewardConversionTrend: -1.8 },
  all: { revenue: 12450000, revenueTrend: 24.5, clients: 1024, clientsTrend: 31.0, avgCheck: 3290, avgCheckTrend: 3.6, rewardConversion: 70, rewardConversionTrend: 4.1 },
};

const cohortData = [
  { month: 'Дек 2025', values: [100, 72, 58, 49, 41, 36] },
  { month: 'Янв 2026', values: [100, 68, 55, 44, 38, null] },
  { month: 'Фев 2026', values: [100, 75, 61, 50, null, null] },
  { month: 'Мар 2026', values: [100, 70, 57, null, null, null] },
  { month: 'Апр 2026', values: [100, 73, null, null, null, null] },
  { month: 'Май 2026', values: [100, null, null, null, null, null] },
];

const topRewards = [
  { name: 'Капучино бесплатно', claims: 342 },
  { name: 'Скидка 20% на торт', claims: 278 },
  { name: 'Круассан в подарок', claims: 215 },
  { name: 'Двойные баллы', claims: 189 },
  { name: 'Набор макарон', claims: 156 },
];

function generateHeatmapData(dayLabels: string[]) {
  const data: { day: string; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let base = 0;
      // Morning rush 8-10
      if (h >= 8 && h <= 10) base = 25 + Math.random() * 20;
      // Lunch 12-14
      else if (h >= 12 && h <= 14) base = 30 + Math.random() * 25;
      // After work 17-19
      else if (h >= 17 && h <= 19) base = 20 + Math.random() * 18;
      // Evening 20-22
      else if (h >= 20 && h <= 22) base = 10 + Math.random() * 12;
      // Night
      else if (h >= 0 && h <= 6) base = Math.random() * 3;
      else base = 5 + Math.random() * 10;
      // Weekends slightly different
      if (d >= 5) {
        if (h >= 10 && h <= 16) base = 30 + Math.random() * 20;
        else if (h >= 0 && h <= 8) base = Math.random() * 2;
      }
      data.push({ day: dayLabels[d], hour: h, count: Math.round(base) });
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ title, value, trend, suffix, idx }: { title: string; value: string; trend: number; suffix?: string; idx: number }) {
  const { t } = useTranslation();
  const positive = trend >= 0;
  return (
    <motion.div
      custom={idx}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-1"
    >
      <span className="text-stone-400 text-xs font-medium">{title}</span>
      <span className="text-white text-xl font-bold tracking-tight">
        {value}
        {suffix && <span className="text-sm font-normal text-stone-400 ml-1">{suffix}</span>}
      </span>
      <div className={clsx('flex items-center gap-1 text-xs font-medium', positive ? 'text-green-400' : 'text-red-400')}>
        {positive ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
        <span>{positive ? '+' : ''}{trend}%</span>
        <span className="text-stone-500 ml-1">{t('analyticsPage.vsPrevPeriod')}</span>
      </div>
    </motion.div>
  );
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// Custom tooltip for the area chart
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-stone-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-white font-medium">
          {p.dataKey === 'revenue' ? t('analyticsPage.revenue') : t('analyticsPage.vsPrevPeriod')}:{' '}
          <span className={p.dataKey === 'revenue' ? 'text-amber-400' : 'text-stone-400'}>
            {p.value.toLocaleString('ru-RU')} T
          </span>
        </p>
      ))}
    </div>
  );
}

// Pie chart custom label
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30d');
  const kpi = kpiData[period];

  const dayLabels = [t('analyticsPage.mon'), t('analyticsPage.tue'), t('analyticsPage.wed'), t('analyticsPage.thu'), t('analyticsPage.fri'), t('analyticsPage.sat'), t('analyticsPage.sun')];
  const heatmap = useMemo(() => generateHeatmapData(dayLabels), [dayLabels]);
  const revenueChartData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 180;
    return generateRevenueData(days);
  }, [period]);

  const maxHeatVal = useMemo(() => Math.max(...heatmap.map((h) => h.count)), [heatmap]);

  const barColors = ['#f59e0b', '#d97706', '#b45309', '#fbbf24', '#92400e'];

  const periodLabels: Record<Period, string> = {
    '7d': t('analyticsPage.periods.7d'),
    '30d': t('analyticsPage.periods.30d'),
    '90d': t('analyticsPage.periods.90d'),
    all: t('analyticsPage.periods.all'),
  };

  // Generate segmentation data with i18n
  const segmentationData = [
    { name: t('analyticsPage.new'), value: 186, color: '#a8a29e' },
    { name: t('analyticsPage.active'), value: 412, color: '#f59e0b' },
    { name: t('analyticsPage.sleeping'), value: 298, color: '#57534e' },
    { name: t('analyticsPage.vip'), value: 128, color: '#fbbf24' },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold text-white">{t('analyticsPage.title')}</h1>
        <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-0.5">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'text-stone-500 hover:text-stone-300'
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard idx={0} title={t('analyticsPage.revenue')} value={`${formatCurrency(kpi.revenue)} T`} trend={kpi.revenueTrend} />
        <KpiCard idx={1} title={t('analyticsPage.newClients')} value={kpi.clients.toString()} trend={kpi.clientsTrend} />
        <KpiCard idx={2} title={t('analyticsPage.avgCheck')} value={`${kpi.avgCheck.toLocaleString('ru-RU')} T`} trend={kpi.avgCheckTrend} />
        <KpiCard idx={3} title={t('analyticsPage.rewardConversion')} value={`${kpi.rewardConversion}`} trend={kpi.rewardConversionTrend} suffix="%" />
      </div>

      {/* Revenue Chart */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
      >
        <h2 className="text-white text-sm font-semibold mb-3">{t('analyticsPage.revenueDynamics')}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#57534e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#57534e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<RevenueTooltip />} />
            <Area type="monotone" dataKey="prevRevenue" stroke="#57534e" strokeWidth={1.5} fill="url(#gradPrev)" dot={false} />
            <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Cohort Retention Heatmap */}
      <motion.div
        custom={5}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
      >
        <h2 className="text-white text-sm font-semibold mb-3">{t('analyticsPage.cohortRetention')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-stone-500 font-medium pb-2 pr-3 whitespace-nowrap">{t('analyticsPage.cohort')}</th>
                {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map((m) => (
                  <th key={m} className="text-center text-stone-500 font-medium pb-2 px-1 min-w-[36px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortData.map((row) => (
                <tr key={row.month}>
                  <td className="text-stone-400 font-medium pr-3 py-1 whitespace-nowrap">{row.month}</td>
                  {row.values.map((val, ci) => {
                    if (val === null) return <td key={ci} className="px-1 py-1"><div className="w-full h-7 rounded bg-stone-800/40" /></td>;
                    const intensity = val / 100;
                    return (
                      <td key={ci} className="px-1 py-1">
                        <div
                          className="w-full h-7 rounded flex items-center justify-center text-[10px] font-semibold"
                          style={{
                            backgroundColor: `rgba(245, 158, 11, ${0.1 + intensity * 0.7})`,
                            color: intensity > 0.4 ? '#fff' : '#a8a29e',
                          }}
                        >
                          {val}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Top Rewards & Segmentation side by side on larger, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Rewards */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
        >
          <h2 className="text-white text-sm font-semibold mb-3">{t('analyticsPage.topRewardsByUsage')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topRewards} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#a8a29e' }}
                itemStyle={{ color: '#fbbf24' }}
                formatter={(v: number) => [`${v} ${t('analyticsPage.used')}`, t('analyticsPage.used')]}
              />
              <Bar dataKey="claims" radius={[0, 6, 6, 0]} barSize={18}>
                {topRewards.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Customer Segmentation */}
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
        >
          <h2 className="text-white text-sm font-semibold mb-3">{t('analyticsPage.customerSegmentation')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={segmentationData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
                strokeWidth={2}
                stroke="#1c1917"
              >
                {segmentationData.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => {
                  const seg = segmentationData.find((s) => s.name === value);
                  return <span className="text-stone-400 text-[10px] ml-1">{value} ({seg?.value})</span>;
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number, name: string) => [`${v} ${t('analyticsPage.people')}`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Transaction Heatmap */}
      <motion.div
        custom={8}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
      >
        <h2 className="text-white text-sm font-semibold mb-3">{t('analyticsPage.activityByTime')}</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hours header */}
            <div className="flex items-center mb-1">
              <div className="w-8 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[8px] text-stone-600">{h.toString().padStart(2, '0')}</div>
              ))}
            </div>
            {/* Rows */}
            {dayLabels.map((day) => (
              <div key={day} className="flex items-center mb-0.5">
                <div className="w-8 shrink-0 text-[10px] text-stone-500 font-medium">{day}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmap.find((c) => c.day === day && c.hour === h);
                  const val = cell?.count ?? 0;
                  const intensity = maxHeatVal > 0 ? val / maxHeatVal : 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 aspect-square rounded-[3px] mx-[1px] cursor-default"
                      style={{
                        backgroundColor: intensity < 0.05
                          ? '#292524'
                          : `rgba(245, 158, 11, ${0.15 + intensity * 0.75})`,
                      }}
                      title={`${day} ${h}:00 — ${val} ${t('analyticsPage.transactions')}`}
                    />
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-[9px] text-stone-600">{t('analyticsPage.few')}</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <div
                  key={v}
                  className="w-3 h-3 rounded-[2px]"
                  style={{ backgroundColor: `rgba(245, 158, 11, ${0.15 + v * 0.75})` }}
                />
              ))}
              <span className="text-[9px] text-stone-600">{t('analyticsPage.many')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Export Button */}
      <motion.div
        custom={9}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex justify-end"
      >
        <button
          onClick={() => toast(t('analyticsPage.generatingReport'), { icon: '📄', style: { background: '#1c1917', color: '#fff', border: '1px solid #44403c' } })}
          className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-xl px-4 py-2 text-xs font-medium text-stone-400 hover:text-white hover:border-stone-700 transition-all active:scale-[0.97]"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          {t('analyticsPage.exportPdf')}
        </button>
      </motion.div>
    </div>
  );
}
