import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  GiftIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  CubeTransparentIcon,
  SignalIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { io as socketIO } from 'socket.io-client';
import { api } from '../../services/api';
import { CONTRACT_ADDRESSES } from '../../services/ton';

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType = 'PURCHASE' | 'BONUS' | 'REFERRAL' | 'PROMOTION' | 'REDEMPTION';

interface OnChainTx {
  id: string;
  type: TxType;
  amount: string;
  pointsEarned: string;
  txHash: string;
  blockNumber: string | null;
  partnerName: string | null;
  description: string | null;
  createdAt: string;
}

interface ExplorerMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalMinted: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortenHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ─── Type configuration ───────────────────────────────────────────────────────
const TYPE_CONFIG: Record<TxType, {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  PURCHASE: {
    icon: ShoppingBagIcon,
    label: 'Purchase',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
    badgeText: 'text-emerald-400',
  },
  BONUS: {
    icon: SparklesIcon,
    label: 'Bonus',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/20',
    badgeText: 'text-blue-400',
  },
  REFERRAL: {
    icon: UserGroupIcon,
    label: 'Referral',
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-500/10 border border-purple-500/20',
    iconColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/20',
    badgeText: 'text-purple-400',
  },
  PROMOTION: {
    icon: GiftIcon,
    label: 'Promotion',
    borderColor: 'border-l-orange-500',
    iconBg: 'bg-orange-500/10 border border-orange-500/20',
    iconColor: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 border-orange-500/20',
    badgeText: 'text-orange-400',
  },
  REDEMPTION: {
    icon: GiftIcon,
    label: 'Redemption',
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-500/10 border border-rose-500/20',
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 border-rose-500/20',
    badgeText: 'text-rose-400',
  },
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border border-l-4 p-4 animate-pulse"
      style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--sweet-border)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded" style={{ background: 'var(--sweet-border)' }} />
          <div className="h-3 w-1/2 rounded" style={{ background: 'var(--sweet-border)' }} />
          <div className="h-2 w-2/3 rounded mt-2" style={{ background: 'var(--sweet-border)' }} />
        </div>
        <div className="text-right space-y-2">
          <div className="h-3 w-16 rounded" style={{ background: 'var(--sweet-border)' }} />
          <div className="h-2 w-12 rounded" style={{ background: 'var(--sweet-border)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-2xl border px-3 py-3"
      style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
    >
      <p
        className="text-[9px] font-semibold uppercase tracking-widest truncate"
        style={{ color: 'var(--sweet-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold mt-0.5 truncate"
        style={{ color: 'var(--sweet-text)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[9px] truncate mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Transaction card ─────────────────────────────────────────────────────────
function TxCard({ tx, index, isNew }: { tx: OnChainTx; index: number; isNew?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.PURCHASE;
  const Icon = cfg.icon;

  const copyHash = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tx.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently fail
    }
  };

  return (
    <motion.div
      key={tx.id}
      initial={{ opacity: 0, y: isNew ? -12 : 16 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: isNew
          ? ['0 0 0px rgba(251,191,36,0)', '0 0 16px rgba(251,191,36,0.4)', '0 0 0px rgba(251,191,36,0)']
          : 'none',
      }}
      transition={{
        delay: isNew ? 0 : index * 0.04,
        duration: 0.35,
        boxShadow: { duration: 1.4, times: [0, 0.4, 1] },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        'relative rounded-2xl border border-l-4 transition-colors duration-200',
        cfg.borderColor,
        isNew && 'ring-1 ring-amber-400/30'
      )}
      style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={clsx('p-2.5 rounded-xl shrink-0', cfg.iconBg)}>
            <Icon className={clsx('w-4 h-4', cfg.iconColor)} />
          </div>

          {/* Center */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--sweet-text)' }}
              >
                {cfg.label}
              </span>
              <span className={clsx(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                cfg.badgeBg, cfg.badgeText
              )}>
                {tx.type}
              </span>
            </div>
            {tx.partnerName && (
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: 'var(--sweet-text-secondary)' }}
              >
                {tx.partnerName}
              </p>
            )}
          </div>

          {/* Right: amount + time */}
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-400">
              +{Number(tx.pointsEarned).toLocaleString()} SWEET
            </p>
            {Number(tx.amount) > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
                {(Number(tx.amount) / 100).toLocaleString()} KZT
              </p>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
              {timeAgo(tx.createdAt)}
            </p>
            <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
              <ShieldCheckIcon className="w-2.5 h-2.5" />
              {t('explorer.confirmed')}
            </span>
          </div>
        </div>

        {/* Bottom row: hash + block */}
        <div
          className="mt-3 pt-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'var(--sweet-border)' }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span
              className="text-[9px] uppercase tracking-wider shrink-0"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              TX
            </span>
            <a
              href={`https://testnet.tonviewer.com/transaction/${tx.txHash}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[10px] hover:text-amber-400 transition-colors flex items-center gap-0.5 truncate"
              style={{ color: 'var(--sweet-text-secondary)' }}
              title={tx.txHash}
            >
              <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5 shrink-0" />
              {shortenHash(tx.txHash)}
            </a>
            <button
              onClick={copyHash}
              className="p-0.5 rounded transition-colors shrink-0"
              style={{ color: 'var(--sweet-text-faint)' }}
              title={t('explorer.copyHash')}
            >
              {copied
                ? <CheckIcon className="w-3 h-3 text-emerald-400" />
                : <DocumentDuplicateIcon className="w-3 h-3" />}
            </button>
          </div>

          {tx.blockNumber && (
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="text-[9px] uppercase tracking-wider"
                style={{ color: 'var(--sweet-text-faint)' }}
              >
                Block
              </span>
              <span
                className="font-mono text-[10px]"
                style={{ color: 'var(--sweet-text-secondary)' }}
              >
                #{tx.blockNumber}
              </span>
            </div>
          )}

          {/* Hover reveal */}
          <AnimatePresence>
            {hovered && (
              <motion.a
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                href={`https://testnet.tonviewer.com/transaction/${tx.txHash}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors shrink-0 text-[10px] font-medium"
                style={{
                  background: 'var(--sweet-card-hover)',
                  borderColor: 'var(--sweet-border)',
                  color: 'var(--sweet-text-secondary)',
                }}
              >
                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                {t('explorer.viewOnExplorer')}
              </motion.a>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Explorer page ───────────────────────────────────────────────────────
export default function Explorer() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<OnChainTx[]>([]);
  const [meta, setMeta] = useState<ExplorerMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loadingMore, setLoadingMore] = useState(false);

  const contractShort = shortenAddress(CONTRACT_ADDRESSES.loyaltyToken);

  const fetchPage = useCallback(async (p: number, append = false) => {
    if (p === 1 && !append) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.transactions.onChain({ page: p, limit: 15 });
      // axios interceptor returns response.data so res is the full API response
      const body = res as unknown as { data: OnChainTx[]; meta: ExplorerMeta };
      if (append) {
        setTransactions(prev => [...prev, ...body.data]);
      } else {
        setTransactions(body.data);
      }
      setMeta(body.meta);
      setLastUpdated(new Date());
    } catch {
      // silently handle — list stays empty
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Socket.IO subscription for live updates
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('activity:new', (data: {
      id?: string;
      type?: string;
      amount?: number;
      pointsEarned?: number;
      txHash?: string;
      partnerName?: string;
      createdAt?: string;
    }) => {
      // Only add if it has a txHash (on-chain)
      if (!data.txHash) return;

      const newTx: OnChainTx = {
        id: data.id || `live-${Date.now()}`,
        type: (data.type as TxType) || 'PURCHASE',
        amount: String(data.amount || 0),
        pointsEarned: String(data.pointsEarned || 0),
        txHash: data.txHash,
        blockNumber: null,
        partnerName: data.partnerName || null,
        description: null,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setTransactions(prev => [newTx, ...prev]);
      setNewIds(prev => new Set(prev).add(newTx.id));
      setLastUpdated(new Date());
      setMeta(prev => prev ? { ...prev, total: prev.total + 1 } : prev);

      // Clear highlight after 4 s
      setTimeout(() => {
        setNewIds(prev => {
          const next = new Set(prev);
          next.delete(newTx.id);
          return next;
        });
      }, 4000);
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  };

  const hasMore = meta ? page < meta.totalPages : false;

  return (
    <div className="px-0 py-6">
      {/* ── Header ── */}
      <div className="mb-6 pl-1">
        <div className="flex items-center gap-2 mb-1">
          <CubeTransparentIcon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--sweet-text)' }}
          >
            {t('explorer.title')}
          </h1>
        </div>
        <p className="text-sm ml-7" style={{ color: 'var(--sweet-text-secondary)' }}>
          {t('explorer.subtitle')}
        </p>

        {/* Live indicator */}
        <div className="flex items-center gap-2 mt-3 ml-7">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              {t('explorer.connected')}
            </span>
          </span>
          <span className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
            {t('explorer.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        <StatCard
          label={t('explorer.stats.totalTx')}
          value={meta ? meta.total.toLocaleString() : '—'}
          sub={t('explorer.stats.onChainVerified')}
        />
        <StatCard
          label={t('explorer.stats.totalMinted')}
          value={meta ? `${Number(meta.totalMinted).toLocaleString()} SWEET` : '—'}
          sub={t('explorer.stats.allTime')}
        />
        <StatCard
          label={t('explorer.stats.network')}
          value="TON Testnet"
          sub="EQD…"
        />
        <StatCard
          label={t('explorer.stats.contract')}
          value={contractShort}
          sub={
            <a
              href={`https://testnet.tonviewer.com/${CONTRACT_ADDRESSES.loyaltyToken}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-300 transition-colors flex items-center gap-0.5"
              style={{ color: 'var(--sweet-accent)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
              tonviewer
            </a>
          }
        />
      </div>

      {/* ── Contract address bar ── */}
      <div
        className="mb-6 rounded-2xl border px-4 py-3 flex items-center gap-3"
        style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
      >
        <SignalIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--sweet-accent)' }} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[9px] uppercase tracking-wider"
            style={{ color: 'var(--sweet-text-muted)' }}
          >
            {t('explorer.jettonContract')}
          </p>
          <p
            className="text-[11px] font-mono truncate mt-0.5"
            style={{ color: 'var(--sweet-text-secondary)' }}
          >
            {CONTRACT_ADDRESSES.loyaltyToken}
          </p>
        </div>
        <a
          href={`https://testnet.tonviewer.com/${CONTRACT_ADDRESSES.loyaltyToken}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors text-[10px] font-medium"
          style={{
            background: 'var(--sweet-card-hover)',
            borderColor: 'var(--sweet-border)',
            color: 'var(--sweet-text-secondary)',
          }}
        >
          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          {t('explorer.viewContract')}
        </a>
      </div>

      {/* ── Transaction list ── */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border text-center py-16"
            style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
          >
            <CubeTransparentIcon
              className="w-14 h-14 mx-auto mb-4"
              style={{ color: 'var(--sweet-text-faint)' }}
            />
            <p className="text-lg font-semibold" style={{ color: 'var(--sweet-text)' }}>
              {t('explorer.empty.title')}
            </p>
            <p
              className="text-sm mt-1 max-w-xs mx-auto"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {t('explorer.empty.subtitle')}
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {transactions.map((tx, idx) => (
                <TxCard
                  key={tx.id}
                  tx={tx}
                  index={idx}
                  isNew={newIds.has(tx.id)}
                />
              ))}
            </AnimatePresence>

            {hasMore && (
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--sweet-card)',
                    borderColor: 'var(--sweet-border)',
                    color: 'var(--sweet-text-secondary)',
                  }}
                >
                  {loadingMore ? (
                    <span
                      className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{
                        borderColor: 'var(--sweet-border)',
                        borderTopColor: 'var(--sweet-text-secondary)',
                      }}
                    />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                  {t('explorer.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer note ── */}
      {!loading && transactions.length > 0 && (
        <p
          className="text-center text-[10px] mt-6"
          style={{ color: 'var(--sweet-text-faint)' }}
        >
          {t('explorer.footerNote')}
        </p>
      )}
    </div>
  );
}
