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
  { label: 'Айгерим (Bronze)', wallet: 'UQBvI0aFLnw2QbZgjMPryQSb4XYiQa3zzDLNTqFKiG8G_WAc' },
  { label: 'Нурсултан (Silver)', wallet: 'UQDtFpEwcFAEcRe5mLVh2N6C7oMVjE2BrJMRoV3YCRx0xBGl' },
  { label: 'Дана (Gold)', wallet: 'UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixG_7Wy2oqqwnT' },
];

const DEMO_ITEMS = [
  'Napoleon Cake',
  'Eclair Set',
  'Coffee & Croissant',
  'Macaron Box (6 pcs)',
  'Honey Cake Slice',
  'Tiramisu',
  'Choco Fondant',
  'Baklava Assortment',
];

const MOCK_ACTIVITIES = [
  { id: 1, type: 'earn', user: 'Айгерим', amount: 150, partner: 'Home Macaron', ago: '2m ago' },
  { id: 2, type: 'redeem', user: 'Нурсултан', amount: 500, partner: 'MUS-MUS', ago: '8m ago' },
  { id: 3, type: 'join', user: 'Дана', amount: 0, partner: 'Partner Network', ago: '15m ago' },
  { id: 4, type: 'earn', user: 'Арман', amount: 240, partner: 'O-Cake', ago: '23m ago' },
  { id: 5, type: 'earn', user: 'Камила', amount: 80, partner: 'Quiynar', ago: '41m ago' },
];

const activityMeta: Record<string, { icon: React.ReactNode; colorStyle: React.CSSProperties; label: string }> = {
  earn: {
    icon: <BoltIcon style={{ width: 14, height: 14 }} />,
    colorStyle: { color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' },
    label: 'Earned',
  },
  redeem: {
    icon: <CakeIcon style={{ width: 14, height: 14 }} />,
    colorStyle: { color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' },
    label: 'Redeemed',
  },
  join: {
    icon: <UserGroupIcon style={{ width: 14, height: 14 }} />,
    colorStyle: { color: '#38bdf8', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' },
    label: 'Joined',
  },
};

// ─── Receipt row ──────────────────────────────────────────────────────────────
function ReceiptRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '11px 0',
        borderBottom: last ? 'none' : '1px solid var(--sweet-border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--sweet-text-muted)' }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
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
  const iconStyle: React.CSSProperties =
    accentColor === 'emerald'
      ? { color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }
      : { color: 'var(--sweet-accent)', background: 'var(--sweet-accent-dim)', border: '1px solid var(--sweet-border-light)' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 18,
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.25,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 120px 80px at 85% 15%, var(--sweet-accent-dim), transparent)',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sweet-text-muted)', lineHeight: 1.4, margin: 0 }}>
            {title}
          </p>
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              ...iconStyle,
            }}
          >
            {icon}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          {loading && value === null ? (
            <Skeleton className="h-8 w-28 mb-3" rounded="md" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{ color: 'var(--sweet-text)' }}>
                <AnimatedNumber value={value ?? 0} className="text-2xl font-bold tracking-tight" />
              </span>
              {suffix && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sweet-text-muted)' }}>{suffix}</span>
              )}
            </div>
          )}

          {trend && (
            <p style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: trendUp ? '#34d399' : '#f87171', margin: 0 }}>
              <ArrowTrendingUpIcon style={{ width: 12, height: 12, transform: trendUp ? 'none' : 'rotate(180deg)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trend}</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid var(--sweet-border)',
        background: 'var(--sweet-accent-dim)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sweet-text)', letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      {badge}
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 13,
  background: 'var(--sweet-input)',
  border: '1px solid var(--sweet-border)',
  color: 'var(--sweet-text)',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

// ─── Main component ───────────────────────────────────────────────────────────
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
  }, [wallet]); // eslint-disable-line

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
    } catch (err: unknown) {
      let message = t('dashboard.transferFailed') || 'Transfer failed';
      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErr = err as any;
        const serverMsg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error;
        const status = axiosErr?.response?.status;
        if (status === 429) {
          message = 'TON API rate limited — please wait 30s and retry';
        } else if (serverMsg) {
          message = serverMsg;
        } else if (axiosErr?.message === 'Network Error') {
          message = 'Cannot reach server — check your connection';
        } else if (axiosErr?.message) {
          message = axiosErr.message;
        }
      }
      toast.error(message, { id: 'transfer' });
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
      const res: any = await api.loyalty.simulatePurchase({
        partnerId: user.id,
        customerWallet: simWallet.trim(),
        amount,
        items: simItems.length > 0 ? simItems : undefined,
      });

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
      let msg = t('dashboard.simulateError') || 'Failed to issue SWEET tokens';
      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErr = err as any;
        const serverMsg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error;
        const status = axiosErr?.response?.status;
        if (status === 429) {
          msg = 'TON API rate limited — please wait 30s and retry';
        } else if (status === 401 || status === 403) {
          msg = 'Session expired — please log in again';
        } else if (serverMsg) {
          msg = serverMsg;
        } else if (axiosErr?.message === 'Network Error') {
          msg = 'Cannot reach server — check your connection';
        } else if (axiosErr?.message) {
          msg = axiosErr.message;
        }
      }
      toast.error(msg);
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
    <div style={{ minHeight: '100vh', paddingBottom: 128, background: 'var(--sweet-bg)', color: 'var(--sweet-text)' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '24px 16px 0' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 28, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--sweet-text)', margin: 0, lineHeight: 1.2 }}>
              {t('dashboard.title')}
            </h1>
            <p style={{ marginTop: 5, fontSize: 13, color: 'var(--sweet-text-muted)' }}>
              {t('dashboard.subtitle')}
            </p>
          </div>
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              borderRadius: 9999,
              fontSize: 11, fontWeight: 700,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#34d399',
              flexShrink: 0,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {t('blockchain.operational') || 'System Operational'}
          </span>
        </motion.div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28, alignItems: 'stretch' }}>
          <StatCard
            title={t('dashboard.treasuryHoldings') || 'Treasury Holdings'}
            value={balance?.sweet ?? null}
            suffix="SWEET"
            trend={t('dashboard.vsLastMonth') || '+12% vs last month'}
            trendUp
            icon={<BuildingLibraryIcon style={{ width: 16, height: 16 }} />}
            accentColor="amber"
            loading={balanceLoading && !balance}
          />
          <StatCard
            title={t('dashboard.activeCustomers') || 'Active Partners'}
            value={summary?.totalPartners ?? null}
            trend="+8% this week"
            trendUp
            icon={<UserGroupIcon style={{ width: 16, height: 16 }} />}
            accentColor="emerald"
            loading={summaryLoading}
          />
          <StatCard
            title={t('dashboard.totalTransactions') || 'Points Issued'}
            value={summary?.totalTransactions ?? null}
            trend={t('dashboard.allTimeRewards') || 'All-time distributed'}
            trendUp
            icon={<ChartBarIcon style={{ width: 16, height: 16 }} />}
            accentColor="amber"
            loading={summaryLoading}
          />
        </div>

        {/* ── Simulate Purchase ───────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            marginBottom: 28,
            borderRadius: 20,
            overflow: 'hidden',
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
            boxShadow: '0 0 0 1px var(--sweet-accent-dim), 0 4px 28px rgba(0,0,0,0.12)',
          }}
        >
          <SectionHeader
            icon={
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: 'var(--sweet-accent)',
                  flexShrink: 0,
                }}
              >
                <ShoppingBagIcon style={{ width: 18, height: 18 }} />
              </div>
            }
            title={t('dashboard.simulatePurchase') || 'Simulate Purchase'}
            badge={
              <span
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 9999,
                  fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em',
                  background: 'var(--sweet-accent-dim)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: 'var(--sweet-accent)',
                }}
              >
                <SparklesIcon style={{ width: 10, height: 10 }} />
                Demo
              </span>
            }
          />

          <div style={{ padding: '20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, marginBottom: 20 }}>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sweet-text-muted)', marginBottom: 8 }}>
                  {t('dashboard.purchaseAmountLabel') || 'Purchase Amount'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 800, color: 'var(--sweet-accent)', userSelect: 'none' }}>
                    &#x20B8;
                  </span>
                  <input
                    type="number"
                    style={{ ...inputStyle, paddingLeft: 30 }}
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
                      style={{ fontSize: 11, marginTop: 7, fontFamily: 'monospace', fontWeight: 800, color: 'var(--sweet-accent)' }}
                    >
                      = {Math.floor(Number(simAmount)).toLocaleString()} SWEET base
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Customer wallet */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sweet-text-muted)', marginBottom: 8 }}>
                  {t('dashboard.customerWalletLabel') || 'Customer Wallet'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    style={{ ...inputStyle, color: 'var(--sweet-text-secondary)' }}
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
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'var(--sweet-text-secondary)',
                      borderColor: simWallet && isValidTonAddress(simWallet) ? 'rgba(16,185,129,0.5)' : 'var(--sweet-border)',
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sweet-text-muted)', marginBottom: 8 }}>
                  {t('dashboard.selectItems') || 'Items (optional)'}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DEMO_ITEMS.map((item) => {
                    const selected = simItems.includes(item);
                    return (
                      <motion.button
                        key={item}
                        type="button"
                        whileTap={{ scale: 0.93 }}
                        onClick={() => toggleItem(item)}
                        style={{
                          fontSize: 11,
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.14s',
                          ...(selected
                            ? { background: 'var(--sweet-accent-dim)', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--sweet-accent)' }
                            : { background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }),
                        }}
                      >
                        {item}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit row */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 18, borderTop: '1px solid var(--sweet-border)', flexWrap: 'wrap' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSimulatePurchase}
                disabled={simLoading || simSuccess || Number(simAmount) <= 0 || !simWallet.trim()}
                style={{
                  flex: '0 0 auto',
                  minWidth: 200,
                  fontWeight: 800,
                  padding: '13px 24px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--sweet-accent)',
                  color: '#0d0b0a',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: (simLoading || simSuccess || Number(simAmount) <= 0 || !simWallet.trim()) ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <AnimatePresence mode="wait">
                  {simSuccess ? (
                    <motion.span key="success" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircleSolidIcon style={{ width: 18, height: 18 }} />
                      Issued!
                    </motion.span>
                  ) : simLoading ? (
                    <motion.span key="loading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      {t('dashboard.issuingSweet') || 'Issuing...'}
                    </motion.span>
                  ) : (
                    <motion.span key="idle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SparklesIcon style={{ width: 15, height: 15 }} />
                      {t('dashboard.issueSweet') || 'Issue SWEET Tokens'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {Number(simAmount) > 0 && simWallet && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                    }}
                  >
                    <CurrencyDollarIcon style={{ width: 15, height: 15, color: 'var(--sweet-text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--sweet-text-muted)' }}>Est. reward:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: 'var(--sweet-accent)' }}>
                      +{Math.floor(Number(simAmount)).toLocaleString()} SWEET
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--sweet-text-faint)' }}>base</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* ── Bottom grid ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

          {/* POS Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div
              style={{
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
                overflow: 'hidden',
              }}
            >
              <SectionHeader
                icon={
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 9,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text-muted)',
                    }}
                  >
                    <CreditCardIcon style={{ width: 15, height: 15 }} />
                  </div>
                }
                title={t('dashboard.cashbackTerminal') || 'Point of Sale Terminal'}
              />

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sweet-text-muted)', marginBottom: 8 }}>
                    {t('dashboard.enterPurchaseAmount') || 'Transaction Amount (KZT)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 800, color: 'var(--sweet-accent)', userSelect: 'none' }}>
                      &#x20B8;
                    </span>
                    <input
                      type="number"
                      style={{ ...inputStyle, paddingLeft: 30 }}
                      placeholder="0.00"
                      value={posAmount}
                      onChange={(e) => setPosAmount(Number(e.target.value) || '')}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-border)')}
                    />
                  </div>
                </div>

                {/* Wallet + QR */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sweet-text-muted)', marginBottom: 8 }}>
                    {t('dashboard.scanCustomerQr') || 'Customer Wallet Address'}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        style={{
                          ...inputStyle,
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: 'var(--sweet-text-secondary)',
                          borderColor: addressError
                            ? 'rgba(239,68,68,0.5)'
                            : clientWalletAddress && !addressError
                            ? 'rgba(16,185,129,0.5)'
                            : 'var(--sweet-border)',
                        }}
                        placeholder="UQ... or EQ..."
                        value={clientWalletAddress}
                        onChange={(e) => handleAddressChange(e.target.value)}
                      />
                      {clientWalletAddress && addressError && (
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                          <ExclamationCircleIcon style={{ width: 15, height: 15, color: '#f87171' }} />
                        </div>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setShowScanner(true)}
                      style={{
                        flexShrink: 0, padding: '11px 12px', borderRadius: 12,
                        background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)',
                        color: 'var(--sweet-text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Scan QR"
                    >
                      <QrCodeIcon style={{ width: 18, height: 18 }} />
                    </motion.button>
                  </div>
                  {addressError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 5 }}>{addressError}</p>}
                  {clientWalletAddress && !addressError && (
                    <p style={{ fontSize: 11, color: '#34d399', marginTop: 5 }}>Valid TON address</p>
                  )}
                </div>

                {/* Cashback preview */}
                <div
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 12,
                    background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--sweet-text-muted)' }}>
                    {t('dashboard.cashbackReward') || 'Loyalty Reward'} ({CASHBACK_RATE * 100}%)
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: 'var(--sweet-accent)' }}>
                    +{Math.floor(Number(posAmount) * CASHBACK_RATE)} SWEET
                  </span>
                </div>

                {/* CTA */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={loading || !wallet || Number(posAmount) <= 0 || !!addressError || !clientWalletAddress}
                  onClick={handleTransfer}
                  style={{
                    width: '100%',
                    fontWeight: 800,
                    padding: '13px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'var(--sweet-accent)',
                    color: '#0d0b0a',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: (loading || !wallet || Number(posAmount) <= 0 || !!addressError || !clientWalletAddress) ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {loading ? (
                    <><div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Sending...</>
                  ) : !wallet ? (
                    t('dashboard.connectWalletFirst')
                  ) : (
                    t('dashboard.processPayment') || 'Authorize Transaction'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                borderRadius: 20,
                padding: 20,
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <ArrowTrendingUpIcon style={{ width: 15, height: 15, color: 'var(--sweet-accent)' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--sweet-text)', margin: 0 }}>
                    {t('dashboard.ecosystemGrowth') || 'Transaction Volume'}
                  </h3>
                </div>
                <select
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '6px 10px',
                    fontSize: 11,
                    color: 'var(--sweet-text-secondary)',
                  }}
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value as 'day' | 'week' | 'month')}
                >
                  <option value="day">{t('dashboard.period24h') || '24 hours'}</option>
                  <option value="week">{t('dashboard.period7d') || '7 days'}</option>
                  <option value="month">{t('dashboard.period30d') || '30 days'}</option>
                </select>
              </div>

              <div style={{ height: 160 }}>
                {chartData.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--sweet-text-faint)' }}>No growth data yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: '100%' }}>
                    {chartData.slice(-14).map((row, i) => {
                      const pct = Math.round((row.value / maxChartVal) * 100);
                      return (
                        <motion.div
                          key={row.name}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transformOrigin: 'bottom' }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 18 }}
                        >
                          <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                            <div
                              style={{
                                width: '100%',
                                borderRadius: '4px 4px 0 0',
                                height: `${Math.max(pct, 4)}%`,
                                background: 'linear-gradient(180deg, var(--sweet-accent) 0%, rgba(245,158,11,0.3) 100%)',
                                opacity: 0.85,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 8, color: 'var(--sweet-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                borderRadius: 20,
                padding: 20,
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <BoltIcon style={{ width: 15, height: 15, color: 'var(--sweet-accent)' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--sweet-text)', margin: 0 }}>Live Activity</h3>
                </div>
                <span
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: '3px 9px', borderRadius: 9999,
                    background: 'rgba(16,185,129,0.1)',
                    color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
                  Live
                </span>
              </div>

              <div>
                {MOCK_ACTIVITIES.map((act, idx) => {
                  const meta = activityMeta[act.type] ?? activityMeta.earn;
                  return (
                    <div key={act.id} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
                      {/* Timeline dot + line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            ...meta.colorStyle,
                          }}
                        >
                          {meta.icon}
                        </div>
                        {idx < MOCK_ACTIVITIES.length - 1 && (
                          <div style={{ width: 1, flex: 1, marginTop: 4, background: 'var(--sweet-border)', minHeight: 16 }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--sweet-text)', margin: 0 }}>
                            {act.user}
                            <span style={{ fontWeight: 400, color: 'var(--sweet-text-muted)' }}> {meta.label.toLowerCase()}</span>
                            {act.amount > 0 && (
                              <span style={{ fontWeight: 800, color: 'var(--sweet-accent)' }}> +{act.amount.toLocaleString()} SWEET</span>
                            )}
                          </p>
                          {act.partner && (
                            <p style={{ fontSize: 11, color: 'var(--sweet-text-faint)', marginTop: 2 }}>at {act.partner}</p>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--sweet-text-faint)', flexShrink: 0 }}>{act.ago}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ── QR Scanner Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScanner && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              style={{
                width: '100%', maxWidth: 380, overflow: 'hidden', position: 'relative',
                borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)',
              }}
            >
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--sweet-border)',
                }}
              >
                <h3 style={{ fontWeight: 800, fontSize: 14, color: 'var(--sweet-text)', margin: 0 }}>
                  {t('dashboard.scannerTitle') || 'Scan Wallet QR'}
                </h3>
                <button
                  onClick={() => setShowScanner(false)}
                  style={{
                    padding: '6px 8px', borderRadius: 10, cursor: 'pointer',
                    background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)',
                    color: 'var(--sweet-text-muted)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <XMarkIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
              <div style={{ background: '#000', position: 'relative', aspectRatio: '1' }}>
                <Suspense
                  fallback={
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                      <div style={{ width: 30, height: 30, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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
      </AnimatePresence>

      {/* ── Sim Receipt Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {simReceipt && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                width: '100%', maxWidth: 380, overflow: 'hidden', borderRadius: 22,
                boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)',
              }}
            >
              {/* Receipt header */}
              <div
                style={{
                  padding: '28px 24px',
                  textAlign: 'center',
                  background: 'var(--sweet-accent-dim)',
                  borderBottom: '1px solid var(--sweet-border)',
                }}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                    background: 'var(--sweet-accent-dim)',
                    border: '2px solid rgba(245,158,11,0.4)',
                  }}
                >
                  <SparklesIcon style={{ width: 30, height: 30, color: 'var(--sweet-accent)' }} />
                </motion.div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--sweet-text)', margin: 0 }}>SWEET Issued!</h3>
                <p style={{ fontSize: 12, marginTop: 5, color: 'var(--sweet-text-muted)' }}>
                  {t('dashboard.customerNotified') || 'Customer notified in real-time'}
                </p>
              </div>

              {/* Receipt rows */}
              <div style={{ padding: '4px 20px' }}>
                <ReceiptRow label="Purchase Amount">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sweet-text)' }}>&#x20B8;{simReceipt.amount.toLocaleString()}</span>
                </ReceiptRow>
                <ReceiptRow label={t('dashboard.pointsIssued') || 'Points Issued'}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sweet-accent)' }}>+{simReceipt.pointsEarned.toLocaleString()} SWEET</span>
                </ReceiptRow>
                <ReceiptRow label={t('dashboard.tierMultiplier') || 'Tier Multiplier'}>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--sweet-text)' }}>&#xD7;{simReceipt.tierMultiplier}</span>
                </ReceiptRow>
                <ReceiptRow label="Partner">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sweet-text)' }}>{simReceipt.partnerName}</span>
                </ReceiptRow>
                <ReceiptRow label="Customer">
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--sweet-text)' }}>
                    {simReceipt.customerWallet.slice(0, 8)}...{simReceipt.customerWallet.slice(-6)}
                  </span>
                </ReceiptRow>
                {simReceipt.items.length > 0 && (
                  <div style={{ padding: '11px 0', borderBottom: '1px solid var(--sweet-border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--sweet-text-muted)', marginBottom: 8 }}>Items</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {simReceipt.items.map((item) => (
                        <span
                          key={item}
                          style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                            background: 'var(--sweet-accent-dim)',
                            color: 'var(--sweet-accent)',
                            border: '1px solid rgba(245,158,11,0.25)',
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <ReceiptRow label={t('dashboard.txHashLabel') || 'Tx Hash'} last>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--sweet-text-faint)' }}>
                      {simReceipt.txHash ? `${simReceipt.txHash.slice(0, 10)}...${simReceipt.txHash.slice(-6)}` : '\u2014'}
                    </span>
                    {simReceipt.txHash && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(simReceipt.txHash); toast.success('Copied!', { duration: 1000 }); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        <ClipboardDocumentIcon style={{ width: 13, height: 13, color: 'var(--sweet-text-faint)' }} />
                      </button>
                    )}
                  </div>
                </ReceiptRow>
              </div>

              <div style={{ padding: '4px 20px 20px' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSimReceipt(null)}
                  style={{
                    width: '100%', padding: '13px', fontWeight: 800, borderRadius: 14,
                    border: 'none', background: 'var(--sweet-accent)', color: '#0d0b0a',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── POS Receipt Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {receipt && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                width: '100%', maxWidth: 380, overflow: 'hidden', borderRadius: 22,
                boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)',
              }}
            >
              {/* Success header */}
              <div
                style={{
                  padding: '28px 24px',
                  textAlign: 'center',
                  background: 'rgba(16,185,129,0.07)',
                  borderBottom: '1px solid var(--sweet-border)',
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                    background: 'rgba(16,185,129,0.12)',
                    border: '2px solid rgba(16,185,129,0.35)',
                  }}
                >
                  <CheckCircleSolidIcon style={{ width: 34, height: 34, color: '#34d399' }} />
                </motion.div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--sweet-text)', margin: 0 }}>Transaction Successful</h3>
                <p style={{ fontSize: 12, marginTop: 5, color: 'var(--sweet-text-muted)' }}>SWEET tokens sent to customer wallet</p>
              </div>

              {/* Rows */}
              <div style={{ padding: '4px 20px' }}>
                <ReceiptRow label="Purchase Amount">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sweet-text)' }}>&#x20B8;{receipt.amount.toLocaleString()}</span>
                </ReceiptRow>
                <ReceiptRow label="Cashback (10%)">
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>+{receipt.cashback.toLocaleString()} SWEET</span>
                </ReceiptRow>
                <ReceiptRow label="Customer Wallet">
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--sweet-text)' }}>
                    {receipt.clientWallet.slice(0, 8)}...{receipt.clientWallet.slice(-6)}
                  </span>
                </ReceiptRow>
                <ReceiptRow label="Time">
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sweet-text)' }}>{receipt.timestamp}</span>
                </ReceiptRow>
                <ReceiptRow label="Transaction ID" last>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--sweet-text-secondary)' }}>{receipt.txId}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(receipt.txId); toast.success('Copied!', { duration: 1000 }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <ClipboardDocumentIcon style={{ width: 13, height: 13, color: 'var(--sweet-text-faint)' }} />
                    </button>
                  </div>
                </ReceiptRow>
              </div>

              <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a
                  href={`https://testnet.tonviewer.com/transaction/${receipt.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '11px', fontWeight: 700, borderRadius: 12, fontSize: 12,
                    textDecoration: 'none',
                    border: '1px solid var(--sweet-border)',
                    color: 'var(--sweet-text-secondary)',
                    background: 'var(--sweet-input)',
                  }}
                >
                  <ArrowUpRightIcon style={{ width: 14, height: 14 }} />
                  View on TON Explorer
                </a>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setReceipt(null)}
                  style={{
                    width: '100%', padding: '13px', fontWeight: 800, borderRadius: 14,
                    border: 'none', background: 'var(--sweet-accent)', color: '#0d0b0a',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
