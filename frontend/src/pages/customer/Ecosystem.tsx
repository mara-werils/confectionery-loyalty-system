import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingStorefrontIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcosystemPartner {
  id: string;
  companyName: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  walletAddress: string;
  joinedAt: string;
  totalTransactions: number;
}

interface EcosystemStats {
  totalPartners: number;
  totalSweetIssued: number;
  totalTransactions: number;
  avgRewardValue: number;
}

interface EcosystemData {
  partners: EcosystemPartner[];
  stats: EcosystemStats;
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_STYLE = {
  GOLD: {
    badge: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    avatarBg: 'linear-gradient(135deg, #2d1f00, #1a1000)',
    avatarBorder: 'rgba(251,191,36,0.50)',
    avatarText: '#fbbf24',
    badgeText: '#000',
    glow: 'rgba(251,191,36,0.15)',
    label: 'Gold',
  },
  SILVER: {
    badge: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
    avatarBg: 'linear-gradient(135deg, #1e1e1e, #111)',
    avatarBorder: 'rgba(203,213,225,0.45)',
    avatarText: '#cbd5e1',
    badgeText: '#000',
    glow: 'rgba(148,163,184,0.12)',
    label: 'Silver',
  },
  BRONZE: {
    badge: 'linear-gradient(135deg, #d97706, #b45309)',
    avatarBg: 'linear-gradient(135deg, #2a1800, #1c1007)',
    avatarBorder: 'rgba(194,120,50,0.45)',
    avatarText: '#f59e0b',
    badgeText: '#fff',
    glow: 'rgba(194,120,50,0.12)',
    label: 'Bronze',
  },
};

// ─── Fallback seed data (shown when API is unavailable) ───────────────────────

const SEED_PARTNERS: EcosystemPartner[] = [
  { id: '1', companyName: 'Home Macaron', tier: 'GOLD', walletAddress: 'UQD6...zTRA', joinedAt: '2026-04-04T00:00:00Z', totalTransactions: 22 },
  { id: '2', companyName: 'Sweets. The Art of Cake', tier: 'SILVER', walletAddress: 'UQBs...e_01', joinedAt: '2026-04-19T00:00:00Z', totalTransactions: 28 },
  { id: '3', companyName: 'Дом десертов MUS-MUS', tier: 'SILVER', walletAddress: 'UQBm...a_02', joinedAt: '2026-05-04T00:00:00Z', totalTransactions: 16 },
  { id: '4', companyName: 'Patisserie de Luxe', tier: 'SILVER', walletAddress: 'UQBp...x_03', joinedAt: '2026-05-10T00:00:00Z', totalTransactions: 5 },
  { id: '5', companyName: 'O-Cake', tier: 'BRONZE', walletAddress: 'UQBo...a_04', joinedAt: '2026-05-14T00:00:00Z', totalTransactions: 12 },
  { id: '6', companyName: 'CakeLab Astana', tier: 'BRONZE', walletAddress: 'UQBc...a_05', joinedAt: '2026-05-20T00:00:00Z', totalTransactions: 7 },
  { id: '7', companyName: 'Home Macaron GreenLine', tier: 'SILVER', walletAddress: 'UQBh...g_06', joinedAt: '2026-05-22T00:00:00Z', totalTransactions: 8 },
  { id: '8', companyName: 'Марлен', tier: 'BRONZE', walletAddress: 'UQBm...r_07', joinedAt: '2026-05-25T00:00:00Z', totalTransactions: 3 },
];

const SEED_STATS: EcosystemStats = {
  totalPartners: 8,
  totalSweetIssued: 118700,
  totalTransactions: 121,
  avgRewardValue: 1319,
};

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ to, duration = 1.6 }: { to: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * to));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [to, duration]);

  return <>{display.toLocaleString()}</>;
}

// ─── Network visualization ────────────────────────────────────────────────────

function NetworkViz({ partners }: { partners: EcosystemPartner[] }) {
  const visible = partners.slice(0, 8);
  const angleStep = (2 * Math.PI) / Math.max(visible.length, 1);
  const radius = 90;

  return (
    <div className="relative w-[260px] h-[260px] mx-auto select-none">
      {/* SVG connecting lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 260 260"
      >
        {visible.map((_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const x2 = 130 + radius * Math.cos(angle);
          const y2 = 130 + radius * Math.sin(angle);
          return (
            <motion.line
              key={i}
              x1={130}
              y1={130}
              x2={x2}
              y2={y2}
              stroke="rgba(245,158,11,0.20)"
              strokeWidth="1"
              strokeDasharray="3 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.6 }}
            />
          );
        })}
      </svg>

      {/* Central SWEET node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="absolute flex flex-col items-center justify-center rounded-full z-10"
        style={{
          width: 64,
          height: 64,
          left: 130 - 32,
          top: 130 - 32,
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          boxShadow: '0 0 28px rgba(245,158,11,0.55), 0 0 60px rgba(245,158,11,0.18)',
        }}
      >
        <SparklesIcon className="w-5 h-5" style={{ color: '#0d0b0a' }} />
        <span className="text-[8px] font-black tracking-wider" style={{ color: '#0d0b0a' }}>SWEET</span>
      </motion.div>

      {/* Partner nodes */}
      {visible.map((partner, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = 130 + radius * Math.cos(angle);
        const y = 130 + radius * Math.sin(angle);
        const ts = TIER_STYLE[partner.tier];
        const letter = partner.companyName.charAt(0).toUpperCase();

        return (
          <motion.div
            key={partner.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 220, damping: 18 }}
            className="absolute flex items-center justify-center rounded-full text-xs font-black"
            style={{
              width: 34,
              height: 34,
              left: x - 17,
              top: y - 17,
              background: ts.avatarBg,
              border: `1.5px solid ${ts.avatarBorder}`,
              color: ts.avatarText,
              boxShadow: `0 0 10px ${ts.glow}`,
              fontSize: 12,
            }}
            title={partner.companyName}
          >
            {letter}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Partner Card ─────────────────────────────────────────────────────────────

function PartnerCard({
  partner,
  index,
}: {
  partner: EcosystemPartner;
  index: number;
}) {
  const ts = TIER_STYLE[partner.tier];
  const letter = partner.companyName.charAt(0).toUpperCase();
  const joinDate = new Date(partner.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${ts.glow}` }}
      className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-3 transition-shadow"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
        cursor: 'default',
      }}
    >
      {/* Subtle tier glow */}
      <div
        className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl pointer-events-none"
        style={{ background: ts.glow, transform: 'translate(30%, -30%)' }}
      />

      {/* Header: avatar + tier badge */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
          style={{
            background: ts.avatarBg,
            border: `1.5px solid ${ts.avatarBorder}`,
            color: ts.avatarText,
          }}
        >
          {letter}
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Tier badge */}
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider"
            style={{ background: ts.badge, color: ts.badgeText }}
          >
            {ts.label}
          </span>

          {/* SWEET accepted badge */}
          <span
            className="flex items-center gap-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399',
            }}
          >
            <CheckBadgeIcon className="w-2.5 h-2.5" />
            SWEET
          </span>
        </div>
      </div>

      {/* Company name */}
      <div className="relative z-10">
        <p
          className="text-sm font-bold leading-tight truncate"
          style={{ color: 'var(--sweet-text)' }}
        >
          {partner.companyName}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
          Member since {joinDate}
        </p>
      </div>

      {/* Stats row */}
      <div
        className="relative z-10 flex items-center gap-2 pt-2"
        style={{ borderTop: '1px solid var(--sweet-border)' }}
      >
        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold" style={{ color: 'var(--sweet-text-secondary)' }}>
            {partner.totalTransactions.toLocaleString()}
          </p>
          <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
            transactions
          </p>
        </div>
        <div
          className="w-px h-6"
          style={{ background: 'var(--sweet-border)' }}
        />
        <div className="flex-1 text-center">
          <p
            className="text-[9px] font-mono truncate"
            style={{ color: 'var(--sweet-text-faint)' }}
          >
            {partner.walletAddress}
          </p>
          <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
            TON wallet
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stats item ───────────────────────────────────────────────────────────────

function StatItem({
  icon,
  value,
  label,
  color,
  delay,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <p className="text-base font-black leading-none" style={{ color: 'var(--sweet-text)' }}>
        <AnimatedCounter to={value} duration={1.4} />
      </p>
      <p className="text-[9px] text-center leading-tight" style={{ color: 'var(--sweet-text-muted)' }}>
        {label}
      </p>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Ecosystem() {
  const { t } = useTranslation();
  const [filterTier, setFilterTier] = useState<'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'>('ALL');

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['ecosystem'],
    queryFn: () => api.partners.ecosystem(),
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ecoData: EcosystemData | null = (raw as any)?.data ?? null;

  const partners: EcosystemPartner[] = ecoData?.partners ?? (isError ? SEED_PARTNERS : []);
  const stats: EcosystemStats = ecoData?.stats ?? (isError ? SEED_STATS : SEED_STATS);

  const filtered =
    filterTier === 'ALL' ? partners : partners.filter((p) => p.tier === filterTier);

  const tiers: Array<{ key: 'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'; label: string; color: string }> = [
    { key: 'ALL', label: t('ecosystem.filterAll'), color: '#f59e0b' },
    { key: 'GOLD', label: t('ecosystem.filterGold'), color: '#fbbf24' },
    { key: 'SILVER', label: t('ecosystem.filterSilver'), color: '#cbd5e1' },
    { key: 'BRONZE', label: t('ecosystem.filterBronze'), color: '#d97706' },
  ];

  return (
    <div className="pb-28" style={{ color: 'var(--sweet-text)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 text-center"
      >
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[10px] font-bold tracking-widest uppercase"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b',
          }}
        >
          <GlobeAltIcon className="w-3 h-3" />
          {t('ecosystem.badge')}
        </div>
        <h1 className="text-2xl font-black leading-tight mb-1" style={{ color: 'var(--sweet-text)' }}>
          {t('ecosystem.title')}
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('ecosystem.subtitle', { count: stats.totalPartners })}
        </p>
      </motion.div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5">
        <StatItem
          icon={<BuildingStorefrontIcon className="w-3.5 h-3.5" />}
          value={stats.totalPartners}
          label={t('ecosystem.statPartners')}
          color="#f59e0b"
          delay={0.1}
        />
        <StatItem
          icon={<SparklesIcon className="w-3.5 h-3.5" />}
          value={stats.totalSweetIssued}
          label={t('ecosystem.statSweet')}
          color="#a78bfa"
          delay={0.15}
        />
        <StatItem
          icon={<ChartBarIcon className="w-3.5 h-3.5" />}
          value={stats.totalTransactions}
          label={t('ecosystem.statTx')}
          color="#34d399"
          delay={0.2}
        />
        <StatItem
          icon={<CurrencyDollarIcon className="w-3.5 h-3.5" />}
          value={stats.avgRewardValue}
          label={t('ecosystem.statAvg')}
          color="#f87171"
          delay={0.25}
        />
      </div>

      {/* ── Network visualization ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative mb-5 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a0e00 0%, #1c1007 60%, #100800 100%)',
          border: '1px solid rgba(245,158,11,0.12)',
          boxShadow: '0 8px 40px rgba(245,158,11,0.08)',
        }}
      >
        {/* Ambient glows */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(245,158,11,0.07)' }}
        />

        <div className="relative z-10 py-8 px-4 flex flex-col items-center">
          <p
            className="text-[10px] font-bold tracking-widest uppercase mb-6"
            style={{ color: 'rgba(245,158,11,0.55)' }}
          >
            {t('ecosystem.networkTitle')}
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center h-[260px]">
              <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : partners.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BuildingStorefrontIcon className="w-10 h-10" style={{ color: 'rgba(245,158,11,0.30)' }} />
              <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                {t('ecosystem.noPartners')}
              </p>
            </div>
          ) : (
            <NetworkViz partners={partners} />
          )}

          <p
            className="text-[9px] mt-5 text-center"
            style={{ color: 'rgba(255,255,255,0.18)' }}
          >
            {t('ecosystem.networkCaption')}
          </p>
        </div>
      </motion.div>

      {/* ── Tier filter pills ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 mb-4 overflow-x-auto pb-1"
      >
        {tiers.map((tier) => (
          <button
            key={tier.key}
            onClick={() => setFilterTier(tier.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
            style={
              filterTier === tier.key
                ? { background: tier.color, color: '#000' }
                : {
                    background: 'var(--sweet-card)',
                    border: '1px solid var(--sweet-border)',
                    color: 'var(--sweet-text-muted)',
                  }
            }
          >
            {tier.label}
          </button>
        ))}
      </motion.div>

      {/* ── Partner grid ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-40 animate-pulse"
                style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
              />
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-14 text-center rounded-2xl"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <TrophyIcon
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: 'var(--sweet-text-faint)' }}
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
              {t('ecosystem.noPartners')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('ecosystem.noPartnersHint')}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {filtered.map((partner, i) => (
              <PartnerCard key={partner.id} partner={partner} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer tagline ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 py-4 text-center"
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <ArrowPathIcon className="w-3 h-3" style={{ color: 'rgba(245,158,11,0.45)' }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--sweet-text-faint)' }}>
            {t('ecosystem.poweredBy')}
          </span>
        </div>
        <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)', opacity: 0.5 }}>
          {t('ecosystem.thesis')}
        </p>
      </motion.div>
    </div>
  );
}
