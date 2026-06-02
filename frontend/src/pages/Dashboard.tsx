import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EcosystemService } from '../services/ecosystem';
import { useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import {
  BuildingLibraryIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  QrCodeIcon,
  XMarkIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationCircleIcon,
  ShoppingBagIcon,
  SparklesIcon,
  BoltIcon,
  CakeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAnalyticsGrowth, useAnalyticsSummary } from '../hooks/useApi';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import Skeleton from '../components/Skeleton';
import AnimatedNumber from '../components/AnimatedNumber';

const Scanner = lazy(() =>
  import('@yudiel/react-qr-scanner').then((module) => ({ default: module.Scanner }))
);

const CASHBACK_RATE = 0.10;

function isValidTonAddress(addr: string): boolean {
  if (!addr) return false;
  if (/^[A-Za-z0-9_-]{48}$/.test(addr)) return true;
  if (/^-?[0-9]+:[0-9a-fA-F]{64}$/.test(addr)) return true;
  return false;
}

interface TxReceipt {
  amount: number;
  cashback: number;
  clientWallet: string;
  timestamp: string;
  txId: string;
}

interface SimulateReceipt {
  pointsEarned: number;
  amount: number;
  customerWallet: string;
  partnerName: string;
  tierMultiplier: number;
  txHash: string;
  items: string[];
  timestamp: string;
}

const DEMO_CUSTOMERS = [
  { label: 'Alice (Bronze)', wallet: 'UQBvI0aFLnw2QbZgjMPryQSb4XYiQa3zzDLNTqFKiG8G_WAc' },
  { label: 'Bob (Silver)', wallet: 'UQDtFpEwcFAEcRe5mLVh2N6C7oMVjE2BrJMRoV3YCRx0xBGl' },
  { label: 'Carol (Gold)', wallet: 'UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixG_7Wy2oqqwnT' },
];

const DEMO_ITEMS = [
  { name: 'Napoleon Cake', icon: '🎂' },
  { name: 'Eclair Set', icon: '🍫' },
  { name: 'Coffee & Croissant', icon: '☕' },
  { name: 'Macaron Box (6 pcs)', icon: '🌸' },
  { name: 'Honey Cake Slice', icon: '🍯' },
  { name: 'Tiramisu', icon: '🍰' },
  { name: 'Choco Fondant', icon: '🍮' },
  { name: 'Baklava Assortment', icon: '🥐' },
];

const MOCK_ACTIVITIES = [
  { id: 1, type: 'earn', user: 'Alice', amount: 150, partner: 'Sweet Corner', ago: '2m ago' },
  { id: 2, type: 'redeem', user: 'Bob', amount: 500, partner: 'Bakehouse', ago: '8m ago' },
  { id: 3, type: 'join', user: 'Carol', amount: 0, partner: 'Partner Network', ago: '15m ago' },
  { id: 4, type: 'earn', user: 'David', amount: 240, partner: 'Macaron Café', ago: '23m ago' },
  { id: 5, type: 'earn', user: 'Eva', amount: 80, partner: 'Sweet Corner', ago: '41m ago' },
];

const activityMeta: Record<string, { icon: React.ReactNode; colorClass: string; label: string }> = {
  earn: {
    icon: <BoltIcon className="w-3.5 h-3.5" />,
    colorClass: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    label: 'Earned',
  },
  redeem: {
    icon: <CakeIcon className="w-3.5 h-3.5" />,
    colorClass: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    label: 'Redeemed',
  },
  join: {
    icon: <UserGroupIcon className="w-3.5 h-3.5" />,
    colorClass: 'text-sky-400 bg-sky-500/10 border border-sky-500/20',
    label: 'Joined',
  },
};

interface StatCardProps {
  title: string;
  value: number | null;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  accentColor?: 'amber' | 'emerald';
  loading?: boolean;
}

function StatCard({ title, value, suffix, trend, trendUp = true, icon, accentColor = 'amber', loading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 120px 80px at 85% 15%, var(--sweet-accent-dim), transparent)' }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--sweet-text-muted)' }}>
            {title}
          </p>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              accentColor === 'emerald'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : ''
            }`}
            style={
              accentColor === 'amber'
                ? { background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)', border: '1px solid var(--sweet-border-light)' }
                : undefined
            }
          >
            {icon}
          </div>
        </div>

        {loading && value === null ? (
          <Skeleton className="h-8 w-28 mb-3" rounded="md" />
        ) : (
          <div className="flex items-baseline gap-1.5 mb-3">
            <span style={{ color: 'var(--sweet-text)' }}>
              <AnimatedNumber
                value={value ?? 0}
                className="text-2xl font-bold tracking-tight"
              />
            </span>
            {suffix && (
              <span className="text-sm font-medium" style={{ color: 'var(--sweet-text-muted)' }}>
                {suffix}
              </span>
            )}
          </div>
        )}

        {trend && (
          <p className={`text-xs flex items-center gap-1 font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            <ArrowUpRightIcon className={`w-3 h-3 ${trendUp ? '' : 'rotate-180'}`} />
            {trend}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<{ sweet: number; ton: number; kztEquivalent: number } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState<number | ''>('');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week');
  const wallet = useTonWallet();
  const [clientWalletAddress, setClientWalletAddress] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [addressError, setAddressError] = useState<string>('');
  const [receipt, setReceipt] = useState<TxReceipt | null>(null);
  const [simAmount, setSimAmount] = useState<number | ''>('');
  const [simWallet, setSimWallet] = useState('');
  const [simItems, setSimItems] = useState<string[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simReceipt, setSimReceipt] = useState<SimulateReceipt | null>(null);
  const [simSuccess, setSimSuccess] = useState(false);

  const { data: growthData } = useAnalyticsGrowth(chartPeriod);
  const { data: summaryData, isLoading: summaryLoading } = useAnalyticsSummary();

  const chartData: { name: string; value: number }[] = Array.isArray(growthData?.data)
    ? growthData.data.map((d: { date?: string; totalPoints?: number }, index: number) => {
      const parsedDate = d?.date ? new Date(d.date) : null;
      const isValidDate = !!parsedDate && !Number.isNaN(parsedDate.getTime());
      return {
        name: isValidDate
          ? parsedDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
          : `#${index + 1}`,
        value: typeof d?.totalPoints === 'number' && Number.isFinite(d.totalPoints) ? d.totalPoints : 0,
      };
    })
    : [];

  const summary = summaryData && typeof summaryData === 'object' && 'data' in summaryData
    ? (summaryData as { data?: { totalPartners?: number; totalTransactions?: number } }).data
    : undefined;

  useEffect(() => {
    if (wallet?.account.address) {
      setBalanceLoading(true);
      loadData(wallet.account.address).finally(() => setBalanceLoading(false));
    }
  }, [wallet?.account.address]);

  useEffect(() => {
    if (wallet && !clientWalletAddress) {
      setClientWalletAddress(wallet.account.address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const loadData = async (address: string) => {
    const bal = await EcosystemService.getBalance(address);
    setBalance(bal);
  };

  const handleAddressChange = (val: string) => {
    setClientWalletAddress(val);
    if (val && !isValidTonAddress(val)) {
      setAddressError('Invalid TON address format');
    } else {
      setAddressError('');
    }
  };

  const handleTransfer = async () => {
    if (!wallet) return;
    const purchaseAmt = Number(posAmount);
    if (purchaseAmt <= 0) {
      toast.error(t('dashboard.enterValidAmount') || 'Enter a valid purchase amount');
      return;
    }
    if (!clientWalletAddress) {
      toast.error(t('dashboard.enterWalletAddress') || 'Enter a client wallet address');
      return;
    }
    if (!isValidTonAddress(clientWalletAddress)) {
      toast.error('Invalid TON wallet address');
      return;
    }
    const cashback = Math.floor(purchaseAmt * CASHBACK_RATE);
    setLoading(true);
    try {
      toast.loading(`Sending ${cashback} SWEET...`, { id: 'transfer' });
      await EcosystemService.transferToClient(cashback, clientWalletAddress);
      toast.dismiss('transfer');
      setReceipt({
        amount: purchaseAmt,
        cashback,
        clientWallet: clientWalletAddress,
        timestamp: new Date().toLocaleString(),
        txId: 'TX-' + Date.now().toString(36).toUpperCase(),
      });
      setPosAmount('');
      setClientWalletAddress('');
      if (wallet?.account.address) loadData(wallet.account.address);
    } catch {
      toast.error(t('dashboard.transferFailed') || 'Transfer failed', { id: 'transfer' });
    }
    setLoading(false);
  };

  const handleSimulatePurchase = async () => {
    const amount = Number(simAmount);
    if (amount <= 0) {
      toast.error(t('dashboard.enterValidAmount') || 'Enter a valid purchase amount');
      return;
    }
    if (!simWallet.trim()) {
      toast.error(t('dashboard.enterWalletAddress') || 'Enter a customer wallet address');
      return;
    }
    if (!user?.id) {
      toast.error('Not authenticated. Please log in.');
      return;
    }

    setSimLoading(true);
    setSimSuccess(false);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.loyalty.simulatePurchase({
        partnerId: user.id,
        customerWallet: simWallet.trim(),
        amount,
        items: simItems.length > 0 ? simItems : undefined,
      }) as any;

      const d = res?.data;
      const receiptData: SimulateReceipt = {
        pointsEarned: Number(d?.transaction?.pointsEarned ?? 0),
        amount,
        customerWallet: simWallet.trim(),
        partnerName: d?.partner?.companyName ?? 'Your Store',
        tierMultiplier: d?.tierMultiplier ?? 1,
        txHash: d?.transaction?.txHash ?? '',
        items: simItems,
        timestamp: new Date().toLocaleString(),
      };
      setSimSuccess(true);
      setTimeout(() => {
        setSimReceipt(receiptData);
        setSimSuccess(false);
        toast.success(t('dashboard.simulateSuccess') || 'SWEET issued successfully!');
        setSimAmount('');
        setSimWallet('');
        setSimItems([]);
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || t('dashboard.simulateError') || 'Failed to simulate purchase');
      setSimSuccess(false);
    }
    setSimLoading(false);
  };

  const toggleItem = (item: string) => {
    setSimItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const maxChartVal = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value), 1) : 1;

  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--sweet-bg)', color: 'var(--sweet-text)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>
              {t('dashboard.title')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('dashboard.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t('blockchain.operational') || 'System Operational'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title={t('dashboard.treasuryHoldings') || 'Treasury Holdings'}
            value={balance?.sweet ?? null}
            suffix="SWEET"
            trend={t('dashboard.vsLastMonth') || '+12% vs last month'}
            trendUp
            icon={<BuildingLibraryIcon className="w-4 h-4" />}
            accentColor="amber"
            loading={balanceLoading && !balance}
          />
          <StatCard
            title={t('dashboard.activeCustomers') || 'Active Partners'}
            value={summary?.totalPartners ?? null}
            trend="+8% this week"
            trendUp
            icon={<UserGroupIcon className="w-4 h-4" />}
            accentColor="emerald"
            loading={summaryLoading}
          />
          <StatCard
            title={t('dashboard.totalTransactions') || 'Points Issued'}
            value={summary?.totalTransactions ?? null}
            trend={t('dashboard.allTimeRewards') || 'All-time distributed'}
            trendUp
            icon={<ChartBarIcon className="w-4 h-4" />}
            accentColor="amber"
            loading={summaryLoading}
          />
        </div>

        {/* Simulate Purchase */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl overflow-hidden"
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
            boxShadow: '0 0 0 1px var(--sweet-accent-dim), 0 4px 24px rgba(0,0,0,0.15)',
          }}
        >
          <div
            className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ borderBottom: '1px solid var(--sweet-border)', background: 'var(--sweet-accent-dim)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--sweet-accent)' }}
              >
                <ShoppingBagIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--sweet-text)' }}>
                  {t('dashboard.simulatePurchase') || 'Simulate Purchase'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.simulatePurchaseSubtitle') || 'Issue SWEET tokens to a customer — FR1 Demo'}
                </p>
              </div>
            </div>
            <span
              className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'var(--sweet-accent-dim)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--sweet-accent)' }}
            >
              <SparklesIcon className="w-3 h-3" />
              Demo
            </span>
          </div>

          <div className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.purchaseAmountLabel') || 'Purchase Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold select-none" style={{ color: 'var(--sweet-accent)' }}>
                    &#x20B8;
                  </span>
                  <input
                    type="number"
                    className="w-full rounded-xl pl-9 pr-4 py-3 text-sm font-medium focus:outline-none transition-all"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
                    placeholder="1 200"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value) || '')}
                    min={1}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-border)')}
                  />
                </div>
                <AnimatePresence>
                  {Number(simAmount) > 0 && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs mt-2 font-mono font-bold"
                      style={{ color: 'var(--sweet-accent)' }}
                    >
                      = {Math.floor(Number(simAmount)).toLocaleString()} SWEET base
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Customer wallet */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.customerWalletLabel') || 'Customer Wallet'}
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none transition-all"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-secondary)' }}
                    value=""
                    onChange={(e) => { if (e.target.value) setSimWallet(e.target.value); }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-border)')}
                  >
                    <option value="">Quick-fill demo customer...</option>
                    {DEMO_CUSTOMERS.map((c) => (
                      <option key={c.wallet} value={c.wallet}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="w-full rounded-xl px-3 py-3 text-xs font-mono focus:outline-none transition-all"
                    style={{
                      background: 'var(--sweet-input)',
                      border: `1px solid ${simWallet && isValidTonAddress(simWallet) ? 'rgba(16,185,129,0.5)' : 'var(--sweet-border)'}`,
                      color: 'var(--sweet-text-secondary)',
                    }}
                    placeholder="UQ... or EQ..."
                    value={simWallet}
                    onChange={(e) => setSimWallet(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        simWallet && isValidTonAddress(simWallet) ? 'rgba(16,185,129,0.5)' : 'var(--sweet-border)';
                    }}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.selectItems') || 'Items (optional)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_ITEMS.map((item) => {
                    const selected = simItems.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleItem(item.name)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all active:scale-95"
                        style={
                          selected
                            ? { background: 'var(--sweet-accent-dim)', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--sweet-accent)' }
                            : { background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }
                        }
                      >
                        {item.icon} {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit row */}
            <div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-5"
              style={{ borderTop: '1px solid var(--sweet-border)' }}
            >
              <button
                onClick={handleSimulatePurchase}
                disabled={simLoading || simSuccess || Number(simAmount) <= 0 || !simWallet.trim()}
                className="flex-1 sm:flex-none sm:min-w-[220px] font-bold py-3 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--sweet-accent)', color: '#0d0b0a' }}
              >
                <AnimatePresence mode="wait">
                  {simSuccess ? (
                    <motion.span key="success" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                      <CheckCircleSolidIcon className="w-5 h-5" />
                      Issued!
                    </motion.span>
                  ) : simLoading ? (
                    <motion.span key="loading" className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      {t('dashboard.issuingSweet') || 'Issuing...'}
                    </motion.span>
                  ) : (
                    <motion.span key="idle" className="flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4" />
                      {t('dashboard.issueSweet') || 'Issue SWEET Tokens'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence>
                {Number(simAmount) > 0 && simWallet && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}
                  >
                    <CurrencyDollarIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--sweet-text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Est. reward:</span>
                    <span className="font-bold font-mono text-sm" style={{ color: 'var(--sweet-accent)' }}>
                      +{Math.floor(Number(simAmount)).toLocaleString()} SWEET
                    </span>
                    <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>base</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* POS Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-5 xl:col-span-4"
          >
            <div className="rounded-2xl flex flex-col h-full" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}
                >
                  <CreditCardIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                    {t('dashboard.cashbackTerminal') || 'Point of Sale Terminal'}
                  </h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>On-chain cashback transfer</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                    {t('dashboard.enterPurchaseAmount') || 'Transaction Amount (KZT)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold select-none" style={{ color: 'var(--sweet-accent)' }}>
                      &#x20B8;
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none transition-all"
                      style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
                      placeholder="0.00"
                      value={posAmount}
                      onChange={(e) => setPosAmount(Number(e.target.value) || '')}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-border)')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
                    {t('dashboard.scanCustomerQr') || 'Customer Wallet Address'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        className="w-full rounded-xl px-3 py-3 text-xs font-mono focus:outline-none transition-all"
                        style={{
                          background: 'var(--sweet-input)',
                          border: `1px solid ${
                            addressError
                              ? 'rgba(239,68,68,0.5)'
                              : clientWalletAddress && !addressError
                              ? 'rgba(16,185,129,0.5)'
                              : 'var(--sweet-border)'
                          }`,
                          color: 'var(--sweet-text-secondary)',
                        }}
                        placeholder="UQ... or EQ..."
                        value={clientWalletAddress}
                        onChange={(e) => handleAddressChange(e.target.value)}
                      />
                      {clientWalletAddress && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {addressError
                            ? <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                            : <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                          }
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowScanner(true)}
                      className="shrink-0 px-3 py-3 rounded-xl transition-colors"
                      style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}
                      title="Scan QR"
                    >
                      <QrCodeIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {addressError && <p className="text-xs text-red-400 mt-1.5">{addressError}</p>}
                  {clientWalletAddress && !addressError && (
                    <p className="text-xs text-emerald-400 mt-1.5">Valid TON address</p>
                  )}
                </div>

                <div
                  className="flex justify-between items-center px-4 py-3 rounded-xl mt-auto"
                  style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                    {t('dashboard.cashbackReward') || 'Loyalty Reward'} ({CASHBACK_RATE * 100}%)
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: 'var(--sweet-accent)' }}>
                    +{Math.floor(Number(posAmount) * CASHBACK_RATE)} SWEET
                  </span>
                </div>

                <button
                  disabled={loading || !wallet || Number(posAmount) <= 0 || !!addressError || !clientWalletAddress}
                  onClick={handleTransfer}
                  className="w-full font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--sweet-accent)', color: '#0d0b0a' }}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Sending...</>
                  ) : !wallet ? (
                    t('dashboard.connectWalletFirst')
                  ) : (
                    t('dashboard.processPayment') || 'Authorize Transaction'
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right column */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-5"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <ArrowTrendingUpIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                    {t('dashboard.ecosystemGrowth') || 'Transaction Volume'}
                  </h3>
                </div>
                <select
                  className="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-all self-start sm:self-auto"
                  style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-secondary)' }}
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value as 'day' | 'week' | 'month')}
                >
                  <option value="day">{t('dashboard.period24h') || '24 hours'}</option>
                  <option value="week">{t('dashboard.period7d') || '7 days'}</option>
                  <option value="month">{t('dashboard.period30d') || '30 days'}</option>
                </select>
              </div>

              <div className="h-[160px]">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>No growth data yet</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5 h-full">
                    {chartData.slice(-14).map((row, i) => {
                      const pct = Math.round((row.value / maxChartVal) * 100);
                      return (
                        <motion.div
                          key={row.name}
                          className="flex-1 flex flex-col items-center gap-1"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 18 }}
                          style={{ transformOrigin: 'bottom' }}
                        >
                          <div className="relative w-full flex-1 flex items-end">
                            <div
                              className="w-full rounded-t-md"
                              style={{
                                height: `${Math.max(pct, 4)}%`,
                                background: 'linear-gradient(180deg, var(--sweet-accent) 0%, rgba(245,158,11,0.35) 100%)',
                                opacity: 0.85,
                              }}
                            />
                          </div>
                          <span className="text-[9px] hidden sm:block truncate w-full text-center" style={{ color: 'var(--sweet-text-faint)' }}>
                            {row.name.split(' ')[0]}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl p-5"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <BoltIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>Live Activity</h3>
                </div>
                <span
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>

              <div className="space-y-0">
                {MOCK_ACTIVITIES.map((act, idx) => {
                  const meta = activityMeta[act.type] ?? activityMeta.earn;
                  return (
                    <div key={act.id} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center w-7 shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.colorClass}`}>
                          {meta.icon}
                        </div>
                        {idx < MOCK_ACTIVITIES.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: 'var(--sweet-border)', minHeight: '16px' }} />
                        )}
                      </div>
                      <div className="flex-1 pb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--sweet-text)' }}>
                            {act.user}
                            <span className="font-normal" style={{ color: 'var(--sweet-text-muted)' }}>
                              {' '}{meta.label.toLowerCase()}
                            </span>
                            {act.amount > 0 && (
                              <span className="font-bold" style={{ color: 'var(--sweet-accent)' }}>
                                {' '}+{act.amount.toLocaleString()} SWEET
                              </span>
                            )}
                          </p>
                          {act.partner && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>at {act.partner}</p>
                          )}
                        </div>
                        <span className="text-xs shrink-0 ml-3" style={{ color: 'var(--sweet-text-faint)' }}>{act.ago}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm overflow-hidden relative rounded-2xl shadow-2xl"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <div className="flex justify-between items-center p-4" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--sweet-text)' }}>
                {t('dashboard.scannerTitle') || 'Scan Wallet QR'}
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black relative aspect-square">
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
                  </div>
                }
              >
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      let address = result[0].rawValue;
                      if (address.startsWith('ton://transfer/')) {
                        address = address.replace('ton://transfer/', '').split('?')[0];
                      }
                      setClientWalletAddress(address);
                      setShowScanner(false);
                      toast.success(t('dashboard.walletTarget') || 'Wallet address captured!');
                    }
                  }}
                />
              </Suspense>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sim Receipt Modal */}
      <AnimatePresence>
        {simReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="px-6 py-6 text-center" style={{ background: 'var(--sweet-accent-dim)', borderBottom: '1px solid var(--sweet-border)' }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--sweet-accent-dim)', border: '2px solid rgba(245,158,11,0.4)' }}
                >
                  <SparklesIcon className="w-8 h-8" style={{ color: 'var(--sweet-accent)' }} />
                </motion.div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--sweet-text)' }}>SWEET Issued!</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.customerNotified') || 'Customer notified in real-time'}
                </p>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Purchase Amount</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>&#x20B8;{simReceipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{t('dashboard.pointsIssued') || 'Points Issued'}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--sweet-accent)' }}>+{simReceipt.pointsEarned.toLocaleString()} SWEET</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{t('dashboard.tierMultiplier') || 'Tier Multiplier'}</span>
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--sweet-text)' }}>&#xD7;{simReceipt.tierMultiplier}</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Partner</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{simReceipt.partnerName}</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Customer</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sweet-text)' }}>
                    {simReceipt.customerWallet.slice(0, 8)}...{simReceipt.customerWallet.slice(-6)}
                  </span>
                </div>
                {simReceipt.items.length > 0 && (
                  <div className="py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--sweet-text-muted)' }}>Items</p>
                    <div className="flex flex-wrap gap-1">
                      {simReceipt.items.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)', border: '1px solid rgba(245,158,11,0.25)' }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{t('dashboard.txHashLabel') || 'Tx Hash'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--sweet-text-faint)' }}>
                      {simReceipt.txHash ? `${simReceipt.txHash.slice(0, 10)}...${simReceipt.txHash.slice(-6)}` : '\u2014'}
                    </span>
                    {simReceipt.txHash && (
                      <button onClick={() => { navigator.clipboard.writeText(simReceipt.txHash); toast.success('Copied!', { duration: 1000 }); }}>
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-text-faint)' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setSimReceipt(null)}
                  className="w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  style={{ background: 'var(--sweet-accent)', color: '#0d0b0a' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POS Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="px-6 py-6 text-center" style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid var(--sweet-border)' }}>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.35)' }}
                >
                  <CheckCircleSolidIcon className="w-9 h-9 text-emerald-400" />
                </motion.div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--sweet-text)' }}>Transaction Successful</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--sweet-text-muted)' }}>SWEET tokens sent to customer wallet</p>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Purchase Amount</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>&#x20B8;{receipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Cashback (10%)</span>
                  <span className="text-sm font-bold text-emerald-400">+{receipt.cashback.toLocaleString()} SWEET</span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Customer Wallet</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sweet-text)' }}>
                    {receipt.clientWallet.slice(0, 8)}...{receipt.clientWallet.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Time</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--sweet-text)' }}>{receipt.timestamp}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Transaction ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono" style={{ color: 'var(--sweet-text-secondary)' }}>{receipt.txId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(receipt.txId); toast.success('Copied!', { duration: 1000 }); }}>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-text-faint)' }} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2">
                <a
                  href={`https://testnet.tonviewer.com/transaction/${receipt.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  style={{ border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-secondary)', background: 'var(--sweet-input)' }}
                >
                  <ArrowUpRightIcon className="w-4 h-4" />
                  View on TON Explorer
                </a>
                <button
                  onClick={() => setReceipt(null)}
                  className="w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                  style={{ background: 'var(--sweet-accent)', color: '#0d0b0a' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
