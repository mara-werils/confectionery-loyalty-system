import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  GiftIcon,
  UsersThreeIcon,
  CoinsIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  CheckIcon,
  CubeTransparentIcon,
  WifiHighIcon,
  CaretDownIcon,
  WalletIcon,
  DatabaseIcon,
  LightningIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { io as socketIO } from 'socket.io-client';
import { api } from '../../services/api';
import { CONTRACT_ADDRESSES } from '../../services/ton';

// ─── Constants ───────────────────────────────────────────────────────────────
const TONAPI_BASE = 'https://testnet.tonapi.io/v2';
const ADMIN_WALLET = 'kQAOFMfMOeu7WTVfROzwMfNSKNesma8dQ37nQOb2dkqohECz';

const CONTRACTS = [
  { key: 'loyaltyToken', name: 'LoyaltyToken', address: CONTRACT_ADDRESSES.loyaltyToken },
  { key: 'partnerRegistry', name: 'PartnerRegistry', address: CONTRACT_ADDRESSES.partnerRegistry },
  { key: 'redemptionManager', name: 'RedemptionManager', address: CONTRACT_ADDRESSES.redemptionManager },
  { key: 'revenueDistribution', name: 'RevenueDistribution', address: CONTRACT_ADDRESSES.revenueDistribution },
] as const;

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

interface TonApiAccount {
  address: string;
  balance: number;
  status: string;
  last_activity: number;
  name?: string;
}

interface JettonInfo {
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: string;
  };
  total_supply?: string;
  holders_count?: number;
  mintable?: boolean;
}

// ─── Fetcher helpers ─────────────────────────────────────────────────────────
async function fetchTonApi<T>(path: string): Promise<T> {
  const res = await fetch(`${TONAPI_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`TonAPI ${res.status}`);
  return res.json() as Promise<T>;
}

function nanoToTon(nano: number | string): string {
  return (Number(nano) / 1e9).toFixed(4);
}

function formatSupply(raw: string | undefined, decimals: number): string {
  if (!raw) return '0';
  const val = Number(raw) / Math.pow(10, decimals);
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function timestampAgo(ts: number): string {
  if (!ts) return 'N/A';
  const diff = Math.floor(Date.now() / 1000 - ts);
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
    icon: CoinsIcon,
    label: 'Bonus',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/20',
    badgeText: 'text-blue-400',
  },
  REFERRAL: {
    icon: UsersThreeIcon,
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

// ─── Skeleton block ───────────────────────────────────────────────────────────
function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-2xl border p-4 animate-pulse space-y-3"
      style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded" style={{ background: 'var(--sweet-border)', width: `${70 - i * 15}%` }} />
      ))}
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

// ─── Token Stats Card (Live from TON) ─────────────────────────────────────────
function TokenStatsCard() {
  const { data: jetton, isLoading, isError } = useQuery({
    queryKey: ['jetton-info'],
    queryFn: () => fetchTonApi<JettonInfo>(`/jettons/${CONTRACT_ADDRESSES.loyaltyToken}`),
    staleTime: 60_000,
    retry: 2,
  });

  const decimals = Number(jetton?.metadata?.decimals ?? 9);
  const name = jetton?.metadata?.name ?? 'Sweet Loyalty Points';
  const symbol = jetton?.metadata?.symbol ?? 'SWEET';
  const supply = formatSupply(jetton?.total_supply, decimals);
  const holders = jetton?.holders_count ?? '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <DatabaseIcon className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
            Jetton Token Stats
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
            Live from TON blockchain
          </p>
        </div>
        {isLoading && (
          <span className="ml-auto w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sweet-border)', borderTopColor: 'var(--sweet-accent)' }} />
        )}
        {isError && (
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            API unavailable
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>Name</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--sweet-text)' }}>{name}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>Symbol</p>
          <p className="text-xs font-bold mt-0.5 text-amber-400">{symbol}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>Total Supply</p>
          <p className="text-xs font-bold mt-0.5 text-emerald-400">{supply} {symbol}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>Holders</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--sweet-text)' }}>{String(holders)}</p>
        </div>
      </div>

      <a
        href={`https://testnet.tonviewer.com/${CONTRACT_ADDRESSES.loyaltyToken}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border text-[10px] font-semibold transition-colors hover:border-amber-500/40"
        style={{ borderColor: 'var(--sweet-border)', color: 'var(--sweet-accent)' }}
      >
        <ArrowSquareOutIcon className="w-3 h-3" />
        View Token on TON Explorer
      </a>
    </motion.div>
  );
}

// ─── Contract Status Grid ─────────────────────────────────────────────────────
function ContractStatusGrid() {
  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ['contract-accounts'],
    queryFn: async () => {
      const results: Record<string, TonApiAccount> = {};
      // Fetch all in parallel
      const promises = CONTRACTS.map(async (c) => {
        try {
          const acc = await fetchTonApi<TonApiAccount>(`/accounts/${c.address}`);
          results[c.key] = acc;
        } catch {
          results[c.key] = {
            address: c.address,
            balance: 0,
            status: 'unknown',
            last_activity: 0,
          };
        }
      });
      await Promise.all(promises);
      return results;
    },
    staleTime: 60_000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONTRACTS.map((c) => <SkeletonBlock key={c.key} lines={4} />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pl-1">
        <LightningIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
          Smart Contract Status
        </h3>
        {isError && (
          <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            Partial data
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONTRACTS.map((c, idx) => {
          const acc = accounts?.[c.key];
          const isActive = acc?.status === 'active';
          const balance = acc ? nanoToTon(acc.balance) : '—';
          const lastAct = acc?.last_activity ? timestampAgo(acc.last_activity) : 'N/A';

          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.05 }}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: 'var(--sweet-text)' }}>
                  {c.name}
                </span>
                <span className={clsx(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border',
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                )}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-400' : 'bg-red-400')} />
                  {isActive ? 'Active' : (acc?.status ?? 'Unknown')}
                </span>
              </div>

              <p className="text-[10px] font-mono truncate mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                {c.address}
              </p>

              <div className="flex items-center justify-between text-[10px]">
                <div>
                  <span style={{ color: 'var(--sweet-text-faint)' }}>Balance: </span>
                  <span className="font-bold text-amber-400">{balance} TON</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: 'var(--sweet-text-faint)' }}>
                  <ClockIcon className="w-3 h-3" />
                  <span>{lastAct}</span>
                </div>
              </div>

              <a
                href={`https://testnet.tonviewer.com/${c.address}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-[9px] font-medium transition-colors hover:text-amber-300"
                style={{ color: 'var(--sweet-accent)' }}
              >
                <ArrowSquareOutIcon className="w-2.5 h-2.5" />
                View on tonviewer
              </a>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Wallet Card ────────────────────────────────────────────────────────
function AdminWalletCard() {
  const { data: adminAcc, isLoading: loadingAcc } = useQuery({
    queryKey: ['admin-account'],
    queryFn: () => fetchTonApi<TonApiAccount>(`/accounts/${ADMIN_WALLET}`),
    staleTime: 60_000,
    retry: 2,
  });

  const { data: jettonBalances, isLoading: loadingJetton } = useQuery({
    queryKey: ['admin-jettons'],
    queryFn: async () => {
      try {
        const res = await fetchTonApi<{ balances?: Array<{ balance: string; jetton: { address: string; symbol?: string; decimals?: number; name?: string } }> }>(
          `/accounts/${ADMIN_WALLET}/jettons`
        );
        return res.balances ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
    retry: 2,
  });

  const isLoading = loadingAcc || loadingJetton;
  const tonBalance = adminAcc ? nanoToTon(adminAcc.balance) : '—';

  // Find SWEET jetton balance
  const sweetBalance = jettonBalances?.find((b) => {
    const addr = b.jetton.address?.toLowerCase() ?? '';
    return addr.includes(CONTRACT_ADDRESSES.loyaltyToken.toLowerCase().replace(/[^a-z0-9]/g, ''));
  });
  const sweetAmount = sweetBalance
    ? (Number(sweetBalance.balance) / Math.pow(10, sweetBalance.jetton.decimals ?? 9)).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <WalletIcon className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
            Admin Wallet
          </h3>
          <p className="text-[10px] font-mono" style={{ color: 'var(--sweet-text-muted)' }}>
            {shortenAddress(ADMIN_WALLET)}
          </p>
        </div>
        {isLoading && (
          <span className="ml-auto w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sweet-border)', borderTopColor: 'var(--sweet-accent)' }} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>TON Balance</p>
          <p className="text-xs font-bold mt-0.5 text-amber-400">{tonBalance} TON</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-bg)' }}>
          <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>SWEET Balance</p>
          <p className="text-xs font-bold mt-0.5 text-emerald-400">{sweetAmount} SWEET</p>
        </div>
      </div>

      <a
        href={`https://testnet.tonviewer.com/${ADMIN_WALLET}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border text-[10px] font-semibold transition-colors hover:border-purple-500/40"
        style={{ borderColor: 'var(--sweet-border)', color: 'var(--sweet-text-secondary)' }}
      >
        <ArrowSquareOutIcon className="w-3 h-3" />
        View Admin Wallet on TON Explorer
      </a>
    </motion.div>
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
              <ShieldCheckIcon weight="fill" className="w-2.5 h-2.5" />
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
              <ArrowSquareOutIcon className="w-2.5 h-2.5 shrink-0" />
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
                : <CopyIcon className="w-3 h-3" />}
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
                <ArrowSquareOutIcon className="w-3 h-3" />
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
              <ArrowSquareOutIcon className="w-2.5 h-2.5" />
              tonviewer
            </a>
          }
        />
      </div>

      {/* ── Live Blockchain Data Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TokenStatsCard />
        <AdminWalletCard />
      </div>

      {/* ── Contract Status Grid ── */}
      <div className="mb-6">
        <ContractStatusGrid />
      </div>

      {/* ── Contract address bar ── */}
      <div
        className="mb-6 rounded-2xl border px-4 py-3 flex items-center gap-3"
        style={{ borderColor: 'var(--sweet-border)', background: 'var(--sweet-card)' }}
      >
        <WifiHighIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--sweet-accent)' }} />
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
          <ArrowSquareOutIcon className="w-3 h-3" />
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
                    <CaretDownIcon className="w-4 h-4" />
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
