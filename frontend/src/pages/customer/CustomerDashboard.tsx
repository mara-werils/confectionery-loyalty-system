import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  GiftIcon,
  TicketIcon,
  TrophyIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  LinkIcon,
  ArrowUpRightIcon,
  QrCodeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { TIER_CONFIG } from '../../config/tiers';
import AnimatedNumber from '../../components/AnimatedNumber';

import Skeleton from '../../components/Skeleton';
import PurchaseNotification from '../../components/PurchaseNotification';
import { io as socketIO } from 'socket.io-client';
import { Gift, SpinnerGap, PaperPlaneTilt, Trophy } from '@phosphor-icons/react';

const TIERS = TIER_CONFIG;

const JETTON_ADDRESS = 'kQBNOiJ4aToE-Ea12DpY5nBmu1bKT0axt81JmS9BFPh8nCio';
const JETTON_EXPLORER_URL = `https://testnet.tonviewer.com/${JETTON_ADDRESS}`;

// Per-tier hero card styling — intentionally rich/dark for branding impact
const TIER_HERO = {
  BRONZE: {
    gradient: 'linear-gradient(135deg, #1c1007 0%, #2a1800 40%, #1a0e00 100%)',
    glowColor: 'rgba(194,120,50,0.18)',
    glowColor2: 'rgba(180,80,10,0.10)',
    badgeBg: 'rgba(194,120,50,0.15)',
    badgeBorder: 'rgba(194,120,50,0.35)',
    badgeText: '#d97706',
    accent: '#f59e0b',
    shimmer: 'rgba(245,158,11,0.05)',
    borderColor: 'rgba(245,158,11,0.12)',
  },
  SILVER: {
    gradient: 'linear-gradient(135deg, #141414 0%, #1e1e1e 40%, #111111 100%)',
    glowColor: 'rgba(148,163,184,0.15)',
    glowColor2: 'rgba(100,116,139,0.10)',
    badgeBg: 'rgba(148,163,184,0.15)',
    badgeBorder: 'rgba(148,163,184,0.35)',
    badgeText: '#94a3b8',
    accent: '#cbd5e1',
    shimmer: 'rgba(203,213,225,0.04)',
    borderColor: 'rgba(148,163,184,0.15)',
  },
  GOLD: {
    gradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 40%, #1a1000 100%)',
    glowColor: 'rgba(251,191,36,0.22)',
    glowColor2: 'rgba(245,158,11,0.12)',
    badgeBg: 'rgba(251,191,36,0.18)',
    badgeBorder: 'rgba(251,191,36,0.45)',
    badgeText: '#fbbf24',
    accent: '#fbbf24',
    shimmer: 'rgba(251,191,36,0.07)',
    borderColor: 'rgba(251,191,36,0.20)',
  },
};

interface JettonBalance {
  balance: string;
  decimals: number;
}

interface Transaction {
  hash: string;
  amount: string;
  sender: string;
  comment: string;
  timestamp: number;
}

interface PurchaseAwardedPayload {
  partnerName: string;
  pointsEarned: number;
  amount: number;
  items: string[];
  txHash: string;
  timestamp: string;
}

function safeFromJettonRaw(rawBalance: string, decimals: number): number {
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, Math.min(18, decimals)) : 9;
  const parsed = Number(rawBalance);
  if (!Number.isFinite(parsed)) return 0;
  const divisor = Math.pow(10, safeDecimals);
  return Math.floor(parsed / divisor);
}

// Stagger container variants
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

export default function CustomerDashboard() {
  const wallet = useTonWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeCoupons, sweetBalance, setSweetBalance, token, user } = useAuthStore();
  const [balance, setBalance] = useState<JettonBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);
  const [purchaseAlert, setPurchaseAlert] = useState<PurchaseAwardedPayload | null>(null);

  const walletAddress = wallet?.account.address || '';
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);

  // ── Achievements ────────────────────────────────────────────────────────────
  const { data: achievementsData } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.achievements.getAll(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  // ── Rewards preview ─────────────────────────────────────────────────────────
  const { data: rewardsRaw } = useQuery({
    queryKey: ['rewards-preview'],
    queryFn: () => api.rewards.list({ available: true }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  // ── Spin status ─────────────────────────────────────────────────────────────
  const { data: spinStatusRaw } = useQuery({
    queryKey: ['spin-status'],
    queryFn: () => api.spin.status(),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spinStatus = (spinStatusRaw as any)?.data;
  const canSpin = spinStatus?.canSpin ?? true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAchievements = (achievementsData as any)?.data;
  const allAchievements: { id: string; name: string; icon: string; unlockedAt?: string }[] =
    Array.isArray(rawAchievements) ? rawAchievements : [];
  const unlockedAchievements = allAchievements.filter((a) => !!a.unlockedAt).slice(0, 2);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRewards = (rewardsRaw as any)?.data;
  const previewRewards: Array<{
    id: string;
    title: string;
    pointsRequired: number;
    category: string;
  }> = Array.isArray(rawRewards) ? rawRewards.slice(0, 4) : [];

  // ── Real-time Socket.IO: listen for purchase:awarded events ─────────────────
  useEffect(() => {
    if (!walletAddress) return;

    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('subscribe:wallet', walletAddress);

    socket.on('purchase:awarded', (payload: PurchaseAwardedPayload) => {
      const store = useAuthStore.getState();
      useAuthStore.setState({ sweetBalance: store.sweetBalance + payload.pointsEarned });
      setPurchaseAlert(payload);
      // Re-fetch from DB to get the authoritative balance
      fetchData();
    });

    // Listen for balance:updated from direct transfers (business -> customer)
    socket.on('balance:updated', (data: { amount?: number; newBalance?: number; balance?: string }) => {
      const increment = data.amount || Number(data.balance || 0) || Number(data.newBalance || 0);
      if (increment > 0) {
        const store = useAuthStore.getState();
        useAuthStore.setState({ sweetBalance: store.sweetBalance + increment });
      }
      // Re-fetch from DB to get the authoritative balance
      fetchData();
    });

    return () => {
      socket.emit('unsubscribe:wallet', walletAddress);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [walletAddress]); // eslint-disable-line

  // ── Data fetch: DB balance (primary) + chain transactions ─────────────────
  const fetchData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      // 1. Get balance from backend DB (source of truth for off-chain operations)
      if (token) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbRes = await api.loyalty.getBalance() as any;
          const dbBalance = Number(dbRes?.data?.balance || 0);
          if (dbBalance > 0) {
            setSweetBalance(dbBalance);
          }
        } catch {
          // Fall through to chain balance
        }
      }

      // 2. If no DB balance, try chain balance as fallback
      if (sweetBalance <= 0) {
        const res = await fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}/jettons`);
        const data = await res.json();
        if (Array.isArray(data?.balances) && data.balances.length > 0) {
          const sweet = data.balances.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b: any) =>
              b.jetton?.address?.toLowerCase() ===
              '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
          );
          if (sweet) {
            setBalance({ balance: sweet.balance, decimals: sweet.jetton?.decimals || 9 });
            setSweetBalance(safeFromJettonRaw(sweet.balance, sweet.jetton?.decimals || 9));
          }
        }
      }

      // 3. Fetch chain transactions for history display
      const txRes = await fetch(
        `https://testnet.tonapi.io/v2/accounts/${walletAddress}/events?limit=10`
      );
      const txData = await txRes.json();

      if (Array.isArray(txData?.events)) {
        const parsed: Transaction[] = txData.events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((e: any) => e.actions?.some((a: any) => a.type === 'JettonTransfer'))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((e: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const action = e.actions.find((a: any) => a.type === 'JettonTransfer');
            return {
              hash: e.event_id,
              amount: action?.JettonTransfer?.amount || '0',
              sender: action?.JettonTransfer?.sender?.address || 'unknown',
              comment: action?.JettonTransfer?.comment || t('customerDashboard.cashback'),
              timestamp: e.timestamp,
            };
          });
        setTransactions(parsed);
      }
    } catch {
      // Silently handle network errors
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [walletAddress, location.pathname]); // eslint-disable-line

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return t('customerDashboard.justNow');
    if (diff < 3600) return t('customerDashboard.minsAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('customerDashboard.hoursAgo', { n: Math.floor(diff / 3600) });
    return t('customerDashboard.daysAgo', { n: Math.floor(diff / 86400) });
  };

  const currentBalance =
    sweetBalance > 0
      ? sweetBalance
      : safeFromJettonRaw(balance?.balance || '0', balance?.decimals || 9);

  const balanceTier = currentBalance >= 20000 ? 'GOLD' : currentBalance >= 5000 ? 'SILVER' : 'BRONZE';
  const tier = user?.tier || balanceTier;
  const effectiveTier = (['BRONZE', 'SILVER', 'GOLD'].indexOf(balanceTier) > ['BRONZE', 'SILVER', 'GOLD'].indexOf(tier)) ? balanceTier : tier;
  const tierData = TIERS[effectiveTier];
  const heroStyle = TIER_HERO[effectiveTier];
  const remaining = Math.max(0, tierData.threshold - currentBalance);
  const progress =
    effectiveTier === 'GOLD' ? 100 : Math.min(100, Math.round((currentBalance / tierData.threshold) * 100));

  const quickActions = [
    {
      label: t('nav.rewards'),
      icon: <Gift size={22} weight="duotone" />,
      route: '/customer/rewards',
      hasBadge: false,
    },
    {
      label: t('nav.spin'),
      icon: <SpinnerGap size={22} weight="duotone" />,
      route: '/customer/spin',
      hasBadge: canSpin,
    },
    {
      label: t('nav.gift'),
      icon: <PaperPlaneTilt size={22} weight="duotone" />,
      route: '/customer/gift',
      hasBadge: false,
    },
    {
      label: t('customerDashboard.achievementsTitle'),
      icon: <Trophy size={22} weight="duotone" />,
      route: '/achievements',
      hasBadge: false,
    },
  ];

  return (
    <motion.div
      className="pb-28"
      style={{ color: 'var(--sweet-text)' }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Real-time Purchase Award Notification ──────────────────────────── */}
      <PurchaseNotification
        payload={purchaseAlert}
        onDismiss={() => setPurchaseAlert(null)}
      />

      {/* ── Hero Balance Card ─────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl mb-6"
        style={{
          background: heroStyle.gradient,
          border: `1px solid ${heroStyle.borderColor}`,
          boxShadow: `0 12px 48px ${heroStyle.glowColor}, 0 2px 8px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: heroStyle.glowColor }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-2xl pointer-events-none"
          style={{ background: heroStyle.glowColor2 }}
        />
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${heroStyle.shimmer} 50%, transparent 60%)`,
            animation: 'shimmer 3.5s infinite',
          }}
        />

        <div className="relative z-10 p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              {/* Label + verified badge */}
              <div className="flex items-center gap-2 mb-2">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: heroStyle.accent, opacity: 0.75 }}
                >
                  {t('customerDashboard.sweetBalance')}
                </p>
                <a
                  href={JETTON_EXPLORER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors"
                  style={{
                    background: 'rgba(52,211,153,0.10)',
                    border: '1px solid rgba(52,211,153,0.25)',
                  }}
                  title={t('customerDashboard.verifiedOnTon')}
                >
                  <ShieldCheckIcon className="w-2.5 h-2.5" style={{ color: '#34d399' }} />
                  <span className="text-[9px] font-bold" style={{ color: '#34d399' }}>
                    TON
                  </span>
                </a>
              </div>

              {/* Balance */}
              {loading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="w-36 h-10" />
                  <Skeleton className="w-24 h-4" />
                </div>
              ) : (
                <>
                  <p className="text-5xl font-black tracking-tight text-white leading-none mb-1">
                    <AnimatedNumber value={currentBalance} duration={1.4} />
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      SWEET tokens
                    </p>
                    <a
                      href={JETTON_EXPLORER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-0.5 text-[10px] transition-colors"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
                      {t('customerDashboard.viewOnChain')}
                    </a>
                  </div>
                  {currentBalance > 0 && (
                    <p
                      className="text-xs font-mono mt-1"
                      style={{ color: heroStyle.accent, opacity: 0.65 }}
                    >
                      ≈{' '}
                      {currentBalance.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{' '}
                      ₸
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
              {/* Tier badge */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{
                  background: heroStyle.badgeBg,
                  border: `1px solid ${heroStyle.badgeBorder}`,
                  color: heroStyle.badgeText,
                }}
              >
                <TrophyIcon className="w-3.5 h-3.5" />
                {t(tierData.labelKey)}
              </div>
              {/* QR toggle */}
              <button
                onClick={() => setQrVisible((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <QrCodeIcon className="w-4 h-4" />
                <span className="text-[10px] font-semibold">QR</span>
              </button>
            </div>
          </div>

          {/* Tier progress */}
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-semibold"
              style={{ color: heroStyle.accent, opacity: 0.65 }}
            >
              {effectiveTier !== 'GOLD'
                ? remaining > 0 ? `${progress}% to ${tierData.next}` : `Ready for ${tierData.next}!`
                : t('customerDashboard.tierGold')}
            </span>
            {effectiveTier !== 'GOLD' && remaining > 0 && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                {remaining.toLocaleString()}{' '}
                {t('customerDashboard.toNext', { next: tierData.next })}
              </span>
            )}
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${heroStyle.accent}90, ${heroStyle.accent})`,
                boxShadow: `0 0 12px ${heroStyle.accent}60`,
              }}
            />
          </div>
        </div>

        {/* Expandable QR panel */}
        <AnimatePresence>
          {qrVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 flex flex-col items-center">
                <div
                  className="w-full h-px mb-4"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                />
                <p
                  className="text-[11px] mb-3 text-center"
                  style={{ color: 'rgba(255,255,255,0.38)' }}
                >
                  {t('customerDashboard.showQr')}
                </p>
                <div className="bg-white p-3 rounded-2xl shadow-2xl ring-1 ring-white/10">
                  <QRCodeSVG
                    value={walletAddress}
                    size={160}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p
                  className="text-[9px] mt-2 font-mono break-all text-center px-4"
                  style={{ color: 'rgba(255,255,255,0.18)' }}
                >
                  {walletAddress}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Quick Actions Row ─────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-4 gap-2 mb-6"
      >
        {quickActions.map((action, i) => (
          <motion.button
            key={action.route}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => navigate(action.route)}
            whileTap={{ scale: 0.91 }}
            className="flex flex-col items-center gap-2 relative py-3 rounded-2xl transition-colors"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--sweet-accent-dim)' }}
            >
              <span style={{ color: 'var(--sweet-accent)' }}>{action.icon}</span>
            </div>
            {action.hasBadge && (
              <span
                className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                }}
              />
            )}
            <span
              className="text-[10px] font-semibold text-center leading-tight px-1"
              style={{ color: 'var(--sweet-text-secondary)' }}
            >
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Daily Check-in Card ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <DailyCheckinCard />
      </motion.div>

      {/* ── Available Rewards Preview ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionHeader
          icon={<GiftIcon className="w-3.5 h-3.5" />}
          label="Available Rewards"
          action={
            <Link
              to="/customer/rewards"
              className="flex items-center gap-0.5 text-[10px] font-semibold"
              style={{ color: 'var(--sweet-accent)' }}
            >
              See All <ChevronRightIcon className="w-3 h-3" />
            </Link>
          }
        />
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {previewRewards.length === 0
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-32 rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--sweet-card)',
                    border: '1px solid var(--sweet-border)',
                  }}
                >
                  <Skeleton className="w-full h-16" rounded="md" />
                  <div className="p-2.5 space-y-1.5">
                    <Skeleton className="w-20 h-3" rounded="md" />
                    <Skeleton className="w-14 h-3" rounded="md" />
                  </div>
                </div>
              ))
            : previewRewards.map((reward, i) => (
                <RewardPreviewCard
                  key={reward.id}
                  reward={reward}
                  currentBalance={currentBalance}
                  index={i}
                  onNavigate={() => navigate('/customer/rewards')}
                />
              ))}
        </div>
      </motion.div>

      {/* ── Active Coupons ──────────────────────────────────────────────────── */}
      {activeCoupons && activeCoupons.length > 0 && (
        <motion.div variants={itemVariants} className="mb-8">
          <SectionHeader
            icon={<TicketIcon className="w-3.5 h-3.5" />}
            label={t('customerDashboard.myCoupons') || 'Active Coupons'}
          />
          <div className="space-y-2">
            {activeCoupons.map((coupon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 overflow-hidden"
                style={{
                  background: 'var(--sweet-card)',
                  border: '1px dashed var(--sweet-border-light)',
                }}
              >
                {/* Ticket notches */}
                <div
                  className="absolute top-1/2 -left-2 w-4 h-4 rounded-full -translate-y-1/2"
                  style={{ background: 'var(--sweet-bg)' }}
                />
                <div
                  className="absolute top-1/2 -right-2 w-4 h-4 rounded-full -translate-y-1/2"
                  style={{ background: 'var(--sweet-bg)' }}
                />
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--sweet-accent-dim)' }}
                  >
                    <TicketIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--sweet-text)' }}>
                      {t(coupon.rewardTitleKey)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
                      {coupon.partnerName}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-mono font-bold tracking-wider shrink-0"
                  style={{ color: 'var(--sweet-accent)' }}
                >
                  {coupon.code}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Achievements Preview ──────────────────────────────────────────── */}
      {unlockedAchievements.length > 0 && (
        <motion.div variants={itemVariants} className="mb-8">
          <SectionHeader
            icon={<TrophyIcon className="w-3.5 h-3.5" />}
            label={t('customerDashboard.myAchievements')}
            action={
              <Link
                to="/achievements"
                className="flex items-center gap-0.5 text-[10px] font-semibold"
                style={{ color: 'var(--sweet-accent)' }}
              >
                {t('customerDashboard.viewAll')} <ChevronRightIcon className="w-3 h-3" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {unlockedAchievements.map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.06 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl"
                style={{
                  background: 'var(--sweet-card)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(251,191,36,0.12)' }}
                >
                  <TrophyIcon className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                </div>
                <p
                  className="text-xs font-semibold leading-tight truncate"
                  style={{ color: 'var(--sweet-text)' }}
                >
                  {ach.name}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Recent Transactions ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          icon={<ClockIcon className="w-3.5 h-3.5" />}
          label={t('customerDashboard.recentCashback')}
          action={
            <Link
              to="/history"
              className="flex items-center gap-0.5 text-[10px] font-semibold"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {t('customerDashboard.viewAll')} <ChevronRightIcon className="w-3 h-3" />
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'var(--sweet-card)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <Skeleton className="w-9 h-9 flex-shrink-0" rounded="full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="w-3/4 h-3" rounded="md" />
                  <Skeleton className="w-1/2 h-2.5" rounded="md" />
                </div>
                <Skeleton className="w-14 h-4 flex-shrink-0" rounded="md" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="py-12 text-center rounded-2xl"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--sweet-accent-dim)' }}
            >
              <ArrowDownIcon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
            </div>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: 'var(--sweet-text-secondary)' }}
            >
              {t('customerDashboard.noTransactions')}
            </p>
            <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('customerDashboard.noTransactionsHint')}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx, i) => (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5"
                style={{
                  background: 'var(--sweet-card)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(52,211,153,0.10)',
                      border: '1px solid rgba(52,211,153,0.22)',
                    }}
                  >
                    <ArrowDownIcon className="w-4 h-4" style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium" style={{ color: 'var(--sweet-text)' }}>
                        {tx.comment || t('customerDashboard.cashback')}
                      </p>
                      <span
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                        style={{
                          background: 'rgba(52,211,153,0.10)',
                          border: '1px solid rgba(52,211,153,0.20)',
                        }}
                      >
                        <ShieldCheckIcon className="w-2 h-2" style={{ color: '#34d399' }} />
                        <span className="text-[8px] font-bold" style={{ color: '#34d399' }}>
                          on-chain
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
                        {formatAddress(tx.sender)} · {timeAgo(tx.timestamp)}
                      </p>
                      {tx.hash && (
                        <a
                          href={`https://testnet.tonviewer.com/transaction/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 transition-colors duration-150"
                          style={{ color: 'var(--sweet-accent)', opacity: 0.5 }}
                          title="Verify on TON blockchain"
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-semibold">TON</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <ArrowUpRightIcon className="w-3 h-3" style={{ color: '#34d399' }} />
                  <p className="text-sm font-bold" style={{ color: '#34d399' }}>
                    +{(Number(tx.amount) / 1e9).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2" style={{ color: 'var(--sweet-text-muted)' }}>
        {icon}
        <span className="text-xs font-semibold tracking-wide">{label}</span>
      </div>
      {action}
    </div>
  );
}

// ─── Reward Preview Card ──────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  DISCOUNT: {
    icon: <TagIcon className="w-4 h-4" />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
  },
  PRODUCT: {
    icon: <GiftIcon className="w-4 h-4" />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
  CASHBACK: {
    icon: <SparklesIcon className="w-4 h-4" />,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
  },
  SPECIAL: {
    icon: <FireIconSolid className="w-4 h-4" />,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
  },
};

function RewardPreviewCard({
  reward,
  currentBalance,
  index,
  onNavigate,
}: {
  reward: { id: string; title: string; pointsRequired: number; category: string };
  currentBalance: number;
  index: number;
  onNavigate: () => void;
}) {
  const canAfford = currentBalance >= reward.pointsRequired;
  const meta = CATEGORY_META[reward.category] || CATEGORY_META.PRODUCT;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.88, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.07 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.95 }}
      onClick={onNavigate}
      className="flex-shrink-0 w-32 text-left rounded-2xl overflow-hidden"
      style={{
        background: 'var(--sweet-card)',
        border: canAfford
          ? `1px solid ${meta.color}40`
          : '1px solid var(--sweet-border)',
        boxShadow: canAfford ? `0 2px 12px ${meta.color}18` : 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <div className="flex items-center justify-center h-16" style={{ background: meta.bg }}>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: `${meta.color}22`,
            color: meta.color,
            border: `1px solid ${meta.color}30`,
          }}
        >
          {meta.icon}
        </div>
      </div>
      <div className="p-2.5">
        <p
          className="text-[11px] font-semibold leading-tight mb-1.5 line-clamp-2"
          style={{ color: 'var(--sweet-text)' }}
        >
          {reward.title}
        </p>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: canAfford ? '#34d399' : 'var(--sweet-text-muted)' }}
          >
            {reward.pointsRequired.toLocaleString()}
          </span>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={
              canAfford
                ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' }
                : { background: 'var(--sweet-border)', color: 'var(--sweet-text-faint)' }
            }
          >
            {canAfford ? 'Claim' : 'pts'}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Daily Check-in Card ──────────────────────────────────────────────────────

function DailyCheckinCard() {
  const { t } = useTranslation();
  const { token, setSweetBalance, sweetBalance } = useAuthStore();

  const { data: statusRaw, refetch } = useQuery({
    queryKey: ['checkin-status'],
    queryFn: () => api.checkin.status(),
    enabled: !!token,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (statusRaw as any)?.data;

  const claimMutation = useMutation({
    mutationFn: () => api.checkin.claim(),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res as any).data;
      setSweetBalance(sweetBalance + data.bonus);
      toast.success(data.message);
      refetch();
    },
    onError: () => {
      const bonus = 10;
      setSweetBalance(sweetBalance + bonus);
      toast.success(`+${bonus} SWEET daily bonus!`);
      localStorage.setItem('lastCheckin', new Date().toISOString());
      refetch();
    },
  });

  const localCheckedToday = (() => {
    const last = localStorage.getItem('lastCheckin');
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  })();

  const streak = status?.currentStreak || 0;
  const canClaim = status?.canClaim ?? !localCheckedToday;
  const multiplier = status?.multiplier || 1;
  const days = status?.history || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 rounded-2xl p-4"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.12)' }}
          >
            {streak >= 3 ? (
              <FireIconSolid className="w-4 h-4" style={{ color: '#fbbf24' }} />
            ) : (
              <ClockIcon className="w-4 h-4" style={{ color: '#f59e0b' }} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--sweet-text)' }}>
              {streak >= 3 ? (
                <span>
                  {streak} <span style={{ color: '#fbbf24' }}>day streak</span>
                </span>
              ) : (
                t('checkin.dailyBonus') || 'Daily Bonus'
              )}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
              {streak > 0
                ? `x${multiplier} multiplier active`
                : t('checkin.startStreak') || 'Start your streak!'}
            </p>
          </div>
        </div>

        <motion.button
          onClick={() => canClaim && claimMutation.mutate()}
          disabled={!canClaim || claimMutation.isPending}
          whileTap={canClaim ? { scale: 0.95 } : {}}
          className={clsx('px-4 py-2 rounded-xl text-xs font-bold transition-all', !canClaim && 'cursor-not-allowed')}
          style={
            canClaim
              ? {
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.30)',
                  color: '#000',
                }
              : {
                  background: 'var(--sweet-border)',
                  color: 'var(--sweet-text-muted)',
                }
          }
        >
          {claimMutation.isPending
            ? '...'
            : canClaim
            ? `+${status?.nextBonus || 10} SWEET`
            : t('checkin.claimed') || 'Claimed'}
        </motion.button>
      </div>

      {/* Week dots */}
      <div className="flex items-center justify-between gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
          const today = new Date();
          const dayDate = new Date(today);
          dayDate.setDate(today.getDate() - today.getDay() + i + 1);
          const dateStr = dayDate.toISOString().split('T')[0];
          const checked = days.some((d: { date: string }) => d.date === dateStr);
          const isToday = dateStr === today.toISOString().split('T')[0];

          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {day}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                style={
                  checked
                    ? {
                        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                        color: '#000',
                        boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                      }
                    : isToday
                    ? {
                        border: '1.5px solid var(--sweet-accent)',
                        color: 'var(--sweet-accent)',
                        background: 'var(--sweet-accent-dim)',
                      }
                    : {
                        border: '1px solid var(--sweet-border)',
                        color: 'var(--sweet-text-faint)',
                        background: 'transparent',
                      }
                }
              >
                {checked ? '✓' : isToday ? '·' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
