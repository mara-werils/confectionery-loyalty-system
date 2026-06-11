import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoneyIcon,
  ArrowSquareOutIcon,
  ClockIcon,
  ShieldCheckIcon,
  CubeTransparentIcon,
  ArrowsClockwiseIcon,
  CoinsIcon,
  CheckCircleIcon as CheckCircleIconSolid,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface SettlementStatus {
  partner: {
    wallet: string;
    tier: string;
    commissionRate: number;
    commissionPct: number;
  };
  pending: {
    nanoTon: string;
    ton: string;
    progressPct: number;
    canDistribute: boolean;
    minPayoutTon: string;
  };
  contract: {
    address: string;
    explorerUrl: string;
    totalDistributedTon: string;
    platformBalanceTon: string;
    contractBalanceTon: string;
    payoutCount: string;
  };
}

interface Payout {
  id: string;
  amountTon: string;
  tier: string;
  period: string;
  status: string;
  txHash: string | null;
  explorerUrl: string | null;
  createdAt: string;
}

// ─── Tier colours ──────────────────────────────────────────────────────────
const TIER_STYLE: Record<string, { gradient: string; label: string; pct: string }> = {
  GOLD:   { gradient: 'from-amber-400 to-yellow-500',  label: 'Gold',   pct: '7%' },
  SILVER: { gradient: 'from-slate-300 to-slate-400',   label: 'Silver', pct: '5%' },
  BRONZE: { gradient: 'from-orange-400 to-amber-600',  label: 'Bronze', pct: '3%' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const DATE_LOCALE: Record<string, string> = { ru: 'ru-RU', en: 'en-US', kz: 'kk-KZ' };

// ─── Component ─────────────────────────────────────────────────────────────
export default function Settlement() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const dateLocale = DATE_LOCALE[i18n.language] ?? 'en-US';
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });

  // Status query (refetch every 20s)
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ data: SettlementStatus }>({
    queryKey: ['settlement', 'status'],
    queryFn: () => api.settlement.getStatus(),
    refetchInterval: 20_000,
  });

  const status = statusData?.data;

  // History query
  const { data: historyData, isLoading: historyLoading } = useQuery<{ data: { payouts: Payout[]; totalPaidTon: string } }>({
    queryKey: ['settlement', 'history'],
    queryFn: () => api.settlement.getHistory(),
  });

  const history = historyData?.data;

  // Distribute mutation
  const distributeMutation = useMutation({
    mutationFn: () => api.settlement.distribute(),
    onSuccess: (res: { data: { amountTon: string; txRef: string; explorerUrl: string; onChain: boolean } }) => {
      if (res.data.onChain) {
        toast.success(`✅ ${t('settlement.toastDispatched', { amount: res.data.amountTon })}`);
      } else {
        toast.success(`✅ ${t('settlement.toastQueued', { amount: res.data.amountTon })}`);
      }
      qc.invalidateQueries({ queryKey: ['settlement'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t('settlement.toastFailed'));
    },
  });

  const tier = status?.partner.tier ?? 'BRONZE';
  const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE.BRONZE;

  return (
    <div className="space-y-5 pb-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <MoneyIcon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>
            {t('settlement.title')}
          </h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('settlement.subtitle')}
        </p>
      </motion.div>

      {/* ── Tier Commission Rate Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        {/* BG gradient accent */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${tierStyle.gradient} opacity-[0.07] pointer-events-none`}
        />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
               style={{ color: 'var(--sweet-text-muted)' }}>
              {t('settlement.yourRate')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black bg-gradient-to-r ${tierStyle.gradient} bg-clip-text text-transparent`}>
                {tierStyle.pct}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
                {t('settlement.ofEveryPurchase')}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('settlement.tierLocked', { tier })}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('settlement.allTiers')}
            </div>
            {[
              { t: 'Bronze', r: '3%' },
              { t: 'Silver', r: '5%' },
              { t: 'Gold',   r: '7%' },
            ].map(({ t, r }) => (
              <div key={t} className="flex justify-between gap-4 text-xs">
                <span style={{ color: tier.toLowerCase() === t.toLowerCase() ? 'var(--sweet-accent)' : 'var(--sweet-text-faint)' }}>
                  {t}
                </span>
                <span style={{ color: tier.toLowerCase() === t.toLowerCase() ? 'var(--sweet-accent)' : 'var(--sweet-text-faint)' }}>
                  {r}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Pending Commission ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 space-y-4"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest"
             style={{ color: 'var(--sweet-text-muted)' }}>
            {t('settlement.pendingCommission')}
          </p>
          <button
            onClick={() => refetchStatus()}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--sweet-text-muted)' }}
          >
            <ArrowsClockwiseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {statusLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <motion.span
                key={status?.pending.ton}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl font-black tabular-nums"
                style={{ color: 'var(--sweet-text)' }}
              >
                {status?.pending.ton ?? '0.0000'}
              </motion.span>
              <span className="text-xl font-bold mb-1" style={{ color: 'var(--sweet-text-secondary)' }}>
                TON
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                <span>{t('settlement.progressToMin')}</span>
                <span>{Math.min(status?.pending.progressPct ?? 0, 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--sweet-input)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(status?.pending.progressPct ?? 0, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${
                    (status?.pending.progressPct ?? 0) >= 100
                      ? 'from-emerald-400 to-green-500'
                      : 'from-amber-400 to-orange-500'
                  }`}
                />
              </div>
              <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {t('settlement.minPayout', { min: status?.pending.minPayoutTon ?? '1.0000' })}
              </p>
            </div>

            {/* Claim button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => distributeMutation.mutate()}
              disabled={!status?.pending.canDistribute || distributeMutation.isPending}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={
                status?.pending.canDistribute
                  ? {
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.35)',
                    }
                  : {
                      background: 'var(--sweet-input)',
                      color: 'var(--sweet-text-faint)',
                      cursor: 'not-allowed',
                    }
              }
            >
              {distributeMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('settlement.broadcasting')}
                </>
              ) : status?.pending.canDistribute ? (
                <>
                  <MoneyIcon className="w-4 h-4" />
                  {t('settlement.claimBtn', { amount: status.pending.ton })}
                </>
              ) : (
                <>
                  <ClockIcon className="w-4 h-4" />
                  {t('settlement.accumulateBtn', { min: status?.pending.minPayoutTon ?? '1.0000' })}
                </>
              )}
            </motion.button>
          </>
        )}
      </motion.div>

      {/* ── Contract Info ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <CubeTransparentIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
          <p className="text-[10px] font-semibold uppercase tracking-widest"
             style={{ color: 'var(--sweet-text-muted)' }}>
            {t('settlement.smartContract')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono" style={{ color: 'var(--sweet-text-secondary)' }}>
              {status ? truncate(status.contract.address) : 'kQCS…u39w'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>
              RevenueDistribution · TON Testnet
            </p>
          </div>
          <a
            href={status?.contract.explorerUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: 'var(--sweet-accent-dim)',
              color: 'var(--sweet-accent)',
            }}
          >
            {t('settlement.verify')}
            <ArrowSquareOutIcon className="w-3 h-3" />
          </a>
        </div>

        {/* Stats grid */}
        {status && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: t('settlement.totalDistributed'), value: `${status.contract.totalDistributedTon} TON` },
              { label: t('settlement.platformReserve'), value: `${status.contract.platformBalanceTon} TON` },
              { label: t('settlement.payoutsMade'),     value: status.contract.payoutCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-2.5 text-center"
                style={{ background: 'var(--sweet-input)' }}
              >
                <p className="text-xs font-bold truncate" style={{ color: 'var(--sweet-text)' }}>
                  {value}
                </p>
                <p className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--sweet-text-faint)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div
          className="flex items-start gap-2 p-2.5 rounded-xl text-[10px]"
          style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {t('settlement.immutableNote')}
          </span>
        </div>

        {/* Contract balance warning */}
        {status && parseFloat(status.contract.contractBalanceTon) < 1.1 && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-xl text-[10px]"
            style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}
          >
            <ClockIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              {t('settlement.reserveWarning', { balance: status.contract.contractBalanceTon })}
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Payout History ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CoinsIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest"
               style={{ color: 'var(--sweet-text-muted)' }}>
              {t('settlement.payoutHistory')}
            </p>
          </div>
          {history && (
            <span className="text-xs font-bold" style={{ color: 'var(--sweet-accent)' }}>
              {t('settlement.totalPaid', { amount: history.totalPaidTon })}
            </span>
          )}
        </div>

        {historyLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : !history?.payouts.length ? (
          <div className="py-6 text-center">
            <MoneyIcon className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--sweet-text)' }} />
            <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('settlement.noPayouts')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>
              {t('settlement.noPayoutsHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {history.payouts.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--sweet-input)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)' }}
                    >
                      <CheckCircleIconSolid weight="fill" className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                        +{p.amountTon} TON
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
                        {formatDate(p.createdAt)} · {p.tier}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={
                        p.status === 'COMPLETED'
                          ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                          : { background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }
                      }
                    >
                      {p.status}
                    </span>
                    {p.explorerUrl && (
                      <a
                        href={p.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg"
                        style={{ color: 'var(--sweet-text-muted)' }}
                      >
                        <ArrowSquareOutIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ── How it works ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest"
           style={{ color: 'var(--sweet-text-muted)' }}>
          {t('settlement.howItWorks')}
        </p>
        <div className="space-y-2.5">
          {[
            {
              step: '1',
              title: t('settlement.step1Title'),
              desc: t('settlement.step1Desc'),
            },
            {
              step: '2',
              title: t('settlement.step2Title'),
              desc: t('settlement.step2Desc', { pct: tierStyle.pct }),
            },
            {
              step: '3',
              title: t('settlement.step3Title'),
              desc: t('settlement.step3Desc'),
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black"
                style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
              >
                {step}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--sweet-text)' }}>
                  {title}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
