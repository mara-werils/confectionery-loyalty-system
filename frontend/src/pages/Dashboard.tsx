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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAnalyticsGrowth, useAnalyticsSummary } from '../hooks/useApi';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const Scanner = lazy(() =>
  import('@yudiel/react-qr-scanner').then((module) => ({ default: module.Scanner }))
);

const CASHBACK_RATE = 0.10;

// Validate TON address format (UQ.../EQ.../kQ...)
function isValidTonAddress(addr: string): boolean {
  if (!addr) return false;
  // Friendly format: base64url 48 chars starting with UQ, EQ, kQ, 0Q, etc.
  if (/^[A-Za-z0-9_-]{48}$/.test(addr)) return true;
  // Raw format: workchain:hex
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

// Known demo customers for quick-fill dropdown
const DEMO_CUSTOMERS = [
  { label: 'Alice (Bronze)', wallet: 'UQBvI0aFLnw2QbZgjMPryQSb4XYiQa3zzDLNTqFKiG8G_WAc' },
  { label: 'Bob (Silver)', wallet: 'UQDtFpEwcFAEcRe5mLVh2N6C7oMVjE2BrJMRoV3YCRx0xBGl' },
  { label: 'Carol (Gold)', wallet: 'UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixG_7Wy2oqqwnT' },
];

// Popular confectionery items for demo
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

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<{ sweet: number; ton: number; kztEquivalent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState<number | ''>('');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week');
  const wallet = useTonWallet();
  const [clientWalletAddress, setClientWalletAddress] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [addressError, setAddressError] = useState<string>('');
  const [receipt, setReceipt] = useState<TxReceipt | null>(null);

  // Simulate Purchase state
  const [simAmount, setSimAmount] = useState<number | ''>('');
  const [simWallet, setSimWallet] = useState('');
  const [simItems, setSimItems] = useState<string[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simReceipt, setSimReceipt] = useState<SimulateReceipt | null>(null);

  const { data: growthData } = useAnalyticsGrowth(chartPeriod);
  const { data: summaryData } = useAnalyticsSummary();

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
      loadData(wallet.account.address);
    }
  }, [wallet?.account.address]);

  useEffect(() => {
    if (wallet && !clientWalletAddress) {
      setClientWalletAddress(wallet.account.address);
    }
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
      // Refresh balance
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.loyalty.simulatePurchase({
        partnerId: user.id,
        customerWallet: simWallet.trim(),
        amount,
        items: simItems.length > 0 ? simItems : undefined,
      }) as any;

      const d = res?.data;
      setSimReceipt({
        pointsEarned: Number(d?.transaction?.pointsEarned ?? 0),
        amount,
        customerWallet: simWallet.trim(),
        partnerName: d?.partner?.companyName ?? 'Your Store',
        tierMultiplier: d?.tierMultiplier ?? 1,
        txHash: d?.transaction?.txHash ?? '',
        items: simItems,
        timestamp: new Date().toLocaleString(),
      });
      toast.success(t('dashboard.simulateSuccess') || 'SWEET issued successfully!');
      setSimAmount('');
      setSimWallet('');
      setSimItems([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || t('dashboard.simulateError') || 'Failed to simulate purchase');
    }
    setSimLoading(false);
  };

  const toggleItem = (item: string) => {
    setSimItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 text-stone-100 font-sans tracking-normal bg-[#0d0b0a]">
      {/* Header */}
      <div className="mb-8 border-b border-stone-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-stone-400 mt-1.5 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {t('blockchain.operational') || 'System Operational'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Token Balance */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-stone-400">{t('dashboard.treasuryHoldings') || 'Treasury Holdings'}</h3>
            <BuildingLibraryIcon className="w-5 h-5 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {balance ? balance.sweet.toLocaleString() : <span className="animate-pulse text-stone-600">—</span>}
              <span className="text-sm text-stone-500 ml-1.5 font-normal">SWEET</span>
            </span>
          </div>
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <ArrowUpRightIcon className="w-3 h-3" /> {t('dashboard.vsLastMonth')}
          </p>
        </div>

        {/* Partners */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-stone-400">{t('dashboard.activeCustomers') || 'Active Partners'}</h3>
            <UserGroupIcon className="w-5 h-5 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {summary?.totalPartners != null
                ? summary.totalPartners.toLocaleString()
                : <span className="inline-block w-12 h-7 bg-stone-800 rounded animate-pulse" />}
            </span>
          </div>
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <ArrowUpRightIcon className="w-3 h-3" /> {t('dashboard.vsLastMonth')}
          </p>
        </div>

        {/* Transactions */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-stone-400">{t('dashboard.totalTransactions') || 'Total Transactions'}</h3>
            <ChartBarIcon className="w-5 h-5 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {summary?.totalTransactions != null
                ? summary.totalTransactions.toLocaleString()
                : <span className="inline-block w-16 h-7 bg-stone-800 rounded animate-pulse" />}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">{t('dashboard.allTimeRewards') || 'All-time distributed rewards'}</p>
        </div>
      </div>

      {/* ── Simulate Purchase (FR1 Demo) ─────────────────────────────────── */}
      <div className="mb-8">
        <div className="bg-stone-900 border border-amber-500/20 rounded-xl shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShoppingBagIcon className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {t('dashboard.simulatePurchase') || 'Simulate Purchase'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('dashboard.simulatePurchaseSubtitle') || 'Issue SWEET tokens to a customer — FR1 Demo'}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              <SparklesIcon className="w-3 h-3" />
              Demo
            </span>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">
                  {t('dashboard.purchaseAmountLabel') || 'Purchase Amount (KZT)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-medium text-sm">₸</span>
                  <input
                    type="number"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="1200"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value) || '')}
                    min={1}
                  />
                </div>
                {/* Points preview */}
                {Number(simAmount) > 0 && (
                  <p className="text-xs text-amber-400 mt-1.5 font-mono">
                    = {Math.floor(Number(simAmount))} SWEET base
                  </p>
                )}
              </div>

              {/* Customer wallet */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">
                  {t('dashboard.customerWalletLabel') || 'Customer Wallet Address'}
                </label>
                <div className="flex flex-col gap-1.5">
                  <select
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    value=""
                    onChange={(e) => { if (e.target.value) setSimWallet(e.target.value); }}
                  >
                    <option value="">Quick-fill demo customer...</option>
                    {DEMO_CUSTOMERS.map((c) => (
                      <option key={c.wallet} value={c.wallet}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2.5 text-stone-300 text-xs font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-stone-700"
                    placeholder="UQ... or EQ... (or type manually)"
                    value={simWallet}
                    onChange={(e) => setSimWallet(e.target.value)}
                  />
                </div>
              </div>

              {/* Items picker */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">
                  {t('dashboard.selectItems') || 'Items purchased (optional)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_ITEMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all font-medium ${
                        simItems.includes(item)
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-700 hover:text-stone-400'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit row */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleSimulatePurchase}
                disabled={simLoading || Number(simAmount) <= 0 || !simWallet.trim()}
                className="flex-1 sm:flex-none sm:min-w-[220px] bg-amber-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {simLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t('dashboard.issuingSweet') || 'Issuing...'}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    {t('dashboard.issueSweet') || 'Issue SWEET Tokens'}
                  </>
                )}
              </button>

              {Number(simAmount) > 0 && simWallet && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-800 text-sm">
                  <span className="text-stone-500 text-xs">Est. reward:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    +{Math.floor(Number(simAmount))} SWEET
                  </span>
                  <span className="text-stone-700 text-xs">base rate</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* POS Terminal */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-stone-900 border border-stone-800/80 rounded-xl flex flex-col h-full shadow-sm">
            <div className="px-5 py-4 border-b border-stone-800/80">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-stone-400" />
                {t('dashboard.cashbackTerminal') || 'Point of Sale Terminal'}
              </h2>
            </div>
            
            <div className="p-5 flex-1 flex flex-col space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-2">
                  {t('dashboard.enterPurchaseAmount') || 'Transaction Amount (KZT)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-medium">₸</span>
                  <input
                    type="number"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition-all min-w-0"
                    placeholder="0.00"
                    value={posAmount}
                    onChange={(e) => setPosAmount(Number(e.target.value) || '')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-400 mb-2">
                  {t('dashboard.scanCustomerQr') || 'Customer Wallet Address'}
                </label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      className={`w-full bg-stone-950 border rounded-lg px-3 py-2.5 text-stone-300 text-sm font-mono focus:outline-none focus:ring-1 transition-all placeholder:text-stone-600 ${
                        addressError
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                          : clientWalletAddress && !addressError
                          ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20'
                          : 'border-stone-800 focus:border-stone-500 focus:ring-stone-500'
                      }`}
                      placeholder="UQ... or EQ..."
                      value={clientWalletAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                    />
                    {clientWalletAddress && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {addressError
                          ? <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                          : <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        }
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="shrink-0 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-2.5 rounded-lg transition-colors border border-stone-700"
                    title="Scan QR"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                  </button>
                </div>
                {addressError && (
                  <p className="text-xs text-red-400 mt-1">{addressError}</p>
                )}
                {clientWalletAddress && !addressError && (
                  <p className="text-xs text-green-400 mt-1">Valid TON address</p>
                )}
              </div>

              <div className="bg-stone-950/50 border border-stone-800/80 px-4 py-3 rounded-lg flex justify-between items-center mt-auto">
                <span className="text-sm text-stone-400 truncate pr-2">{t('dashboard.cashbackReward') || 'Loyalty Reward'} ({CASHBACK_RATE * 100}%)</span>
                <span className="font-mono text-sm font-medium text-stone-200 shrink-0">
                  +{Math.floor(Number(posAmount) * CASHBACK_RATE)} SWEET
                </span>
              </div>

              <button
                disabled={loading || !wallet || Number(posAmount) <= 0 || !!addressError || !clientWalletAddress}
                onClick={handleTransfer}
                className="w-full bg-amber-500 text-black font-semibold py-3 rounded-lg hover:bg-amber-400 active:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" /> Sending...</>
                ) : !wallet ? (
                  t('dashboard.connectWalletFirst')
                ) : (
                  t('dashboard.processPayment') || 'Authorize Transaction'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-stone-900 border border-stone-800/80 rounded-xl p-5 h-[420px] shadow-sm flex flex-col">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">{t('dashboard.ecosystemGrowth') || 'Transaction Volume'}</h3>
              <select
                className="bg-stone-950 border border-stone-800 text-sm text-stone-300 rounded-md px-2 py-1 outline-none"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value as 'day' | 'week' | 'month')}
              >
                <option value="day">{t('dashboard.period24h') || '24 hours'}</option>
                <option value="week">{t('dashboard.period7d') || '7 days'}</option>
                <option value="month">{t('dashboard.period30d') || '30 days'}</option>
              </select>
            </div>
            <div className="flex-1 w-full relative">
              <div className="h-full rounded-lg border border-stone-800 bg-stone-950/40 p-4 overflow-y-auto">
                {chartData.length === 0 ? (
                  <p className="text-xs text-stone-500">No growth data yet</p>
                ) : (
                  <div className="space-y-2">
                    {chartData.slice(-10).map((row) => (
                      <div key={row.name} className="flex items-center justify-between text-xs">
                        <span className="text-stone-500">{row.name}</span>
                        <span className="text-stone-200 font-semibold">{row.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-xl w-full max-w-sm overflow-hidden relative shadow-2xl"
          >
            <div className="flex justify-between items-center p-4 border-b border-stone-800">
              <h3 className="font-semibold text-white text-sm">{t('dashboard.scannerTitle') || 'Scan Wallet QR'}</h3>
              <button onClick={() => setShowScanner(false)} className="text-stone-500 hover:text-white transition-colors bg-stone-800 rounded-md p-1">
                <XMarkIcon className="w-5 h-5" />
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

      {/* Simulate Purchase Receipt Modal */}
      <AnimatePresence>
        {simReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              {/* Success header */}
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-5 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <SparklesIcon className="w-7 h-7 text-amber-400" />
                </motion.div>
                <h3 className="text-lg font-bold text-white">SWEET Issued!</h3>
                <p className="text-xs text-stone-400 mt-1">
                  {t('dashboard.customerNotified') || 'Customer notified in real-time'}
                </p>
              </div>

              {/* Receipt details */}
              <div className="p-5 space-y-2.5">
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Purchase Amount</span>
                  <span className="text-sm font-semibold text-white">₸{simReceipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">{t('dashboard.pointsIssued') || 'Points Issued'}</span>
                  <span className="text-sm font-bold text-amber-400">+{simReceipt.pointsEarned.toLocaleString()} SWEET</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">{t('dashboard.tierMultiplier') || 'Tier Multiplier'}</span>
                  <span className="text-sm text-stone-300 font-mono">×{simReceipt.tierMultiplier}</span>
                </div>
                {simReceipt.items.length > 0 && (
                  <div className="py-2 border-b border-stone-800/60">
                    <p className="text-xs text-stone-500 mb-1">Items</p>
                    <p className="text-xs text-stone-300">{simReceipt.items.join(', ')}</p>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Customer Wallet</span>
                  <span className="text-xs font-mono text-stone-400">
                    {simReceipt.customerWallet.slice(0, 8)}...{simReceipt.customerWallet.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Partner</span>
                  <span className="text-xs text-stone-300">{simReceipt.partnerName}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-stone-500">{t('dashboard.txHashLabel') || 'Tx Hash'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-stone-600">
                      {simReceipt.txHash.slice(0, 10)}...{simReceipt.txHash.slice(-6)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(simReceipt.txHash);
                        toast.success('Copied!', { duration: 1000 });
                      }}
                    >
                      <ClipboardDocumentIcon className="w-3.5 h-3.5 text-stone-600 hover:text-stone-300" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setSimReceipt(null)}
                  className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt / Confirmation Modal */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              {/* Success header */}
              <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-5 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircleIcon className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Transaction Successful</h3>
                <p className="text-xs text-stone-400 mt-1">SWEET tokens sent to customer wallet</p>
              </div>

              {/* Receipt details */}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Purchase Amount</span>
                  <span className="text-sm font-semibold text-white">₸{receipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Cashback (10%)</span>
                  <span className="text-sm font-bold text-green-400">+{receipt.cashback.toLocaleString()} SWEET</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Customer Wallet</span>
                  <span className="text-xs font-mono text-stone-300">
                    {receipt.clientWallet.slice(0, 8)}...{receipt.clientWallet.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800/60">
                  <span className="text-xs text-stone-500">Time</span>
                  <span className="text-xs text-stone-300">{receipt.timestamp}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-stone-500">Transaction ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-stone-400">{receipt.txId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(receipt.txId); toast.success('Copied!', { duration: 1000 }); }}>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5 text-stone-600 hover:text-stone-300" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2">
                <a
                  href={`https://testnet.tonviewer.com/transaction/${receipt.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 border border-stone-700 text-stone-300 font-semibold rounded-xl hover:bg-stone-800 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <ArrowUpRightIcon className="w-4 h-4" />
                  View on TON Explorer
                </a>
                <button
                  onClick={() => setReceipt(null)}
                  className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors text-sm"
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
