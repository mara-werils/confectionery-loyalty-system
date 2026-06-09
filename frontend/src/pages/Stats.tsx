import {
  StorefrontIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  StarIcon,
  TrophyIcon,
  TrendUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@phosphor-icons/react';
import { useAnalyticsSummary, useTopPartners } from '../hooks/useApi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const TIER_COLORS: Record<string, string> = {
  GOLD: '#facc15',
  SILVER: '#a1a1aa',
  BRONZE: '#f97316',
};

const TIER_BADGE: Record<string, React.CSSProperties> = {
  GOLD: { color: '#facc15', background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.22)' },
  SILVER: { color: 'var(--sweet-text-secondary)', background: 'rgba(161,161,170,0.10)', border: '1px solid rgba(161,161,170,0.22)' },
  BRONZE: { color: '#fb923c', background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.22)' },
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: '6px',
        color: isPositive ? '#34d399' : '#f87171',
        background: isPositive ? 'rgba(52,211,153,0.10)' : 'rgba(248,113,113,0.10)',
      }}
    >
      {isPositive ? (
        <ArrowUpIcon style={{ width: 10, height: 10 }} />
      ) : (
        <ArrowDownIcon style={{ width: 10, height: 10 }} />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  growth,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  growth?: number | null;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--sweet-accent), transparent)',
          opacity: 0.3,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', color: 'var(--sweet-text-muted)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            background: 'var(--sweet-accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon style={{ width: 14, height: 14, color: 'var(--sweet-accent)' }} />
        </div>
      </div>
      <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--sweet-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
        {sub && <p style={{ fontSize: '11px', color: 'var(--sweet-text-faint)' }}>{sub}</p>}
        <GrowthBadge value={growth} />
      </div>
    </motion.div>
  );
}

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.28 + i * 0.09, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

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

  const rankColor = (rank: number) => {
    if (rank === 1) return '#facc15';
    if (rank === 2) return 'var(--sweet-text-secondary)';
    if (rank === 3) return '#fb923c';
    return 'var(--sweet-text-faint)';
  };

  return (
    <div style={{ padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ paddingLeft: '4px' }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--sweet-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Статистика экосистемы
        </h1>
        <p style={{ color: 'var(--sweet-text-muted)', marginTop: '6px', fontSize: '14px', margin: '6px 0 0' }}>
          Данные из блокчейна Sweet Loyalty в реальном времени
        </p>
      </motion.div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                borderRadius: '16px',
                height: '96px',
                border: '1px solid var(--sweet-border)',
              }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <StatCard
              index={0}
              icon={StorefrontIcon}
              label="Активные партнёры"
              value={summary?.totalPartners?.toLocaleString() ?? '—'}
              sub="Кондитерские"
              growth={summary?.growth?.partners}
            />
            <StatCard
              index={1}
              icon={ChartBarIcon}
              label="Всего транзакций"
              value={summary?.totalTransactions?.toLocaleString() ?? '—'}
              sub="За всё время"
              growth={summary?.growth?.transactions}
            />
            <StatCard
              index={2}
              icon={StarIcon}
              label="SWEET выпущено"
              value={summary?.totalPointsIssued?.toLocaleString() ?? '—'}
              sub="Токенов создано"
              growth={summary?.growth?.pointsIssued}
            />
            <StatCard
              index={3}
              icon={CurrencyDollarIcon}
              label="SWEET потрачено"
              value={summary?.totalPointsRedeemed?.toLocaleString() ?? '—'}
              sub="Токенов сожжено"
            />
          </div>

          {/* KPIs */}
          <motion.div
            custom={0}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--sweet-accent)' }} />
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sweet-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                Ключевые показатели
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--sweet-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'rgba(52,211,153,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TrendUpIcon style={{ width: 18, height: 18, color: '#34d399' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sweet-text)', margin: 0 }}>Уровень погашения</p>
                  <p style={{ fontSize: '11px', color: 'var(--sweet-text-faint)', margin: '2px 0 0' }}>Потрачено / выпущено баллов</p>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>{redemptionRate}%</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'rgba(250,204,21,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TrophyIcon style={{ width: 18, height: 18, color: '#facc15' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sweet-text)', margin: 0 }}>Ср. баллов / транзакция</p>
                  <p style={{ fontSize: '11px', color: 'var(--sweet-text-faint)', margin: '2px 0 0' }}>Показатель вовлечённости</p>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--sweet-text)', fontVariantNumeric: 'tabular-nums' }}>
                {summary?.avgPointsPerTransaction?.toFixed(0) ?? '—'}
              </span>
            </div>
          </motion.div>

          {/* Tier Distribution Pie */}
          {tierData.length > 0 && (
            <motion.div
              custom={1}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              style={{
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--sweet-accent)' }} />
                <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sweet-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Распределение по уровням
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
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
                          backgroundColor: 'var(--sweet-card)',
                          border: '1px solid var(--sweet-border)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          color: 'var(--sweet-text)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        }}
                        labelStyle={{ color: 'var(--sweet-text-muted)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tierData.map((entry) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: TIER_COLORS[entry.name] || '#71717a',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--sweet-text-secondary)' }}>{entry.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sweet-text)', fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Partners Leaderboard */}
          <motion.div
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--sweet-accent)' }} />
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sweet-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                Лидеры недели
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--sweet-text-faint)', fontWeight: 400 }}>по выпуску SWEET</span>
            </div>

            {topLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: '44px', borderRadius: '10px' }}
                  />
                ))}
              </div>
            ) : topPartners.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topPartners.map((p, idx) => (
                  <motion.div
                    key={p.rank}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.06, duration: 0.3 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 8px',
                      borderRadius: '10px',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    whileHover={{ background: 'var(--sweet-card-hover)' } as never}
                  >
                    {/* Rank number */}
                    <span
                      style={{
                        width: 22,
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: rankColor(p.rank),
                        flexShrink: 0,
                      }}
                    >
                      {p.rank}
                    </span>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--sweet-text)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.companyName}
                      </p>
                    </div>

                    {/* Tier badge */}
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        ...(TIER_BADGE[p.tier] || { color: 'var(--sweet-text-faint)', background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }),
                      }}
                    >
                      {p.tier}
                    </span>

                    {/* Points */}
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--sweet-text)',
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {Number(p.pointsIssued).toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--sweet-text-faint)', fontSize: '13px', padding: '20px 0' }}>
                Нет активности на этой неделе
              </p>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
