import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAnalyticsGrowth, useAnalyticsSummary } from '../hooks/useApi';

const Scanner = lazy(() =>
  import('@yudiel/react-qr-scanner').then((module) => ({ default: module.Scanner }))
);

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

export default function Dashboard() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<{ sweet: number; ton: number; kztEquivalent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState<number | ''>('');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week');
  const wallet = useTonWallet();
  const [clientWalletAddress, setClientWalletAddress] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [addressError, setAddressError] = useState<string>('');
  const [receipt, setReceipt] = useState<TxReceipt | null>(null);

  const { data: growthData } = useAnalyticsGrowth(chartPeriod);
  const { data: summaryData } = useAnalyticsSummary();

  const chartData: { name: string; value: number }[] = Array.isArray(growthData?.data)
    ? growthData.data.map((d: { date: string; totalPoints: number }) => ({
      name: new Date(d.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      value: Number.isFinite(d.totalPoints) ? d.totalPoints : 0,
    }))
    : [];

  const summary = summaryData?.data;

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
    const cashback = Math.floor(purchaseAmt * 0.1);
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
                <span className="text-sm text-stone-400 truncate pr-2">{t('dashboard.cashbackReward') || 'Loyalty Reward'} (10%)</span>
                <span className="font-mono text-sm font-medium text-stone-200 shrink-0">
                  +{Math.floor(Number(posAmount) * 0.1)} SWEET
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#52525b" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} dx={-10} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#292524" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917', // stone-900
                      border: '1px solid #292524', // stone-800
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#a1a1aa" // stone-400
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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

              <div className="px-5 pb-5">
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
