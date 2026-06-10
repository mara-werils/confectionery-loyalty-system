import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
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

const TIER_STYLE: Record<EcosystemPartner['tier'], { color: string; label: string }> = {
  GOLD: { color: '#d99e16', label: 'Gold' },
  SILVER: { color: '#8a93a3', label: 'Silver' },
  BRONZE: { color: '#c2783c', label: 'Bronze' },
};

// ─── Partner logos (keyed by company name) ────────────────────────────────────

const PARTNER_LOGOS: Record<string, string> = {
  'Home Macaron': '/confectionary_logos/home_macaron.jpg',
  'Sweets. The Art of Cake': '/confectionary_logos/sweets_art.svg',
  'Дом десертов MUS-MUS': '/confectionary_logos/mus_mus.svg',
  'O-Cake': '/confectionary_logos/o_cake.svg',
  'CakeLab Astana': '/confectionary_logos/cakelab.svg',
  'Patisserie de Luxe': '/confectionary_logos/patisserie.svg',
  'Home Macaron GreenLine': '/confectionary_logos/hm_greenline.svg',
  'Марлен': '/confectionary_logos/marlen.svg',
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

function AnimatedCounter({ to, duration = 1.4 }: { to: number; duration?: number }) {
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

// ─── Partner Card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner, index }: { partner: EcosystemPartner; index: number }) {
  const ts = TIER_STYLE[partner.tier];
  const letter = partner.companyName.charAt(0).toUpperCase();
  const logo = PARTNER_LOGOS[partner.companyName];
  const joinDate = new Date(partner.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      {/* Header: avatar + tier */}
      <div className="flex items-center justify-between">
        {logo ? (
          <img
            src={logo}
            alt={partner.companyName}
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
            style={{ background: `${ts.color}1a`, color: ts.color }}
          >
            {letter}
          </div>
        )}
        <span className="text-[10px] font-bold tracking-wide" style={{ color: ts.color }}>
          {ts.label}
        </span>
      </div>

      {/* Company name */}
      <div>
        <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--sweet-text)' }}>
          {partner.companyName}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
          {partner.walletAddress} · {joinDate}
        </p>
      </div>

      {/* Transactions */}
      <div className="pt-2" style={{ borderTop: '1px solid var(--sweet-border)' }}>
        <span className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
          {partner.totalTransactions.toLocaleString()}
        </span>
        <span className="text-[10px] ml-1.5" style={{ color: 'var(--sweet-text-muted)' }}>
          transactions
        </span>
      </div>
    </motion.div>
  );
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      <p className="text-base font-black leading-none" style={{ color: 'var(--sweet-text)' }}>
        <AnimatedCounter to={value} />
      </p>
      <p className="text-[9px] text-center leading-tight" style={{ color: 'var(--sweet-text-muted)' }}>
        {label}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Ecosystem() {
  const { t } = useTranslation();
  const [filterTier, setFilterTier] = useState<'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'>('ALL');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['ecosystem'],
    queryFn: () => api.partners.ecosystem(),
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ecoData: EcosystemData | null = (raw as any)?.data ?? null;

  // Use API partners only when they look like the curated, branded partners
  // (i.e. we have a logo for them). Otherwise fall back to the curated seed
  // list so the showcase stays coherent and logos render.
  const apiPartners = ecoData?.partners ?? [];
  const apiHasCurated = apiPartners.some((p) => PARTNER_LOGOS[p.companyName]);
  const partners: EcosystemPartner[] = apiHasCurated ? apiPartners : SEED_PARTNERS;
  const stats: EcosystemStats = apiHasCurated && ecoData?.stats ? ecoData.stats : SEED_STATS;

  const filtered = filterTier === 'ALL' ? partners : partners.filter((p) => p.tier === filterTier);

  const tiers: Array<{ key: 'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'; label: string; color: string }> = [
    { key: 'ALL', label: t('ecosystem.filterAll'), color: 'var(--sweet-accent)' },
    { key: 'GOLD', label: t('ecosystem.filterGold'), color: TIER_STYLE.GOLD.color },
    { key: 'SILVER', label: t('ecosystem.filterSilver'), color: TIER_STYLE.SILVER.color },
    { key: 'BRONZE', label: t('ecosystem.filterBronze'), color: TIER_STYLE.BRONZE.color },
  ];

  return (
    <div className="pb-28" style={{ color: 'var(--sweet-text)' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--sweet-text)' }}>
          {t('ecosystem.title')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('ecosystem.subtitle', { count: stats.totalPartners })}
        </p>
      </motion.div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5">
        <StatItem value={stats.totalPartners} label={t('ecosystem.statPartners')} />
        <StatItem value={stats.totalSweetIssued} label={t('ecosystem.statSweet')} />
        <StatItem value={stats.totalTransactions} label={t('ecosystem.statTx')} />
        <StatItem value={stats.avgRewardValue} label={t('ecosystem.statAvg')} />
      </div>

      {/* ── Tier filter pills ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tiers.map((tier) => (
          <button
            key={tier.key}
            onClick={() => setFilterTier(tier.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
            style={
              filterTier === tier.key
                ? { background: tier.color, color: '#fff' }
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
      </div>

      {/* ── Partner grid ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }} />
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
            <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
              {t('ecosystem.noPartners')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('ecosystem.noPartnersHint')}
            </p>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
            {filtered.map((partner, i) => (
              <PartnerCard key={partner.id} partner={partner} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
