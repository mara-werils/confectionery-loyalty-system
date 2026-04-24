import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion } from 'framer-motion';
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
  ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAnalyticsGrowth, useAnalyticsSummary } from '../hooks/useApi';

export default function Dashboard() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<{ sweet: number; ton: number; kztEquivalent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState<number | ''>('');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week');
  const wallet = useTonWallet();
  const [clientWalletAddress, setClientWalletAddress] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  const { data: growthData } = useAnalyticsGrowth(chartPeriod);
  const { data: summaryData } = useAnalyticsSummary();

  const chartData: { name: string; value: number }[] = growthData?.data?.map(
    (d: { date: string; totalPoints: number }) => ({
      name: new Date(d.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      value: d.totalPoints,
    })
  ) || [];

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
    const cashback = Math.floor(purchaseAmt * 0.1);
    setLoading(true);
    try {
      toast.loading(`${t('dashboard.transferring') || 'Transferring'} ${cashback} SWEET...`, { id: 'transfer' });
      await EcosystemService.transferToClient(cashback, clientWalletAddress);
      toast.success(`${cashback} SWEET ${t('dashboard.transferSuccess') || 'sent to client wallet'}`, { id: 'transfer' });
      setPosAmount('');
    } catch {
      toast.error(t('dashboard.transferFailed') || 'Transfer failed', { id: 'transfer' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 text-zinc-100 font-sans tracking-normal bg-[#09090b]">
      {/* Header */}
      <div className="mb-8 border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm">{t('dashboard.subtitle')}</p>
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
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-zinc-400">{t('dashboard.treasuryHoldings') || 'Treasury Holdings'}</h3>
            <BuildingLibraryIcon className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {balance ? balance.sweet.toLocaleString() : <span className="animate-pulse text-zinc-600">—</span>}
              <span className="text-sm text-zinc-500 ml-1.5 font-normal">SWEET</span>
            </span>
          </div>
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <ArrowUpRightIcon className="w-3 h-3" /> {t('dashboard.vsLastMonth')}
          </p>
        </div>

        {/* Partners */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-zinc-400">{t('dashboard.activeCustomers') || 'Active Partners'}</h3>
            <UserGroupIcon className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {summary?.totalPartners != null
                ? summary.totalPartners.toLocaleString()
                : <span className="inline-block w-12 h-7 bg-zinc-800 rounded animate-pulse" />}
            </span>
          </div>
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <ArrowUpRightIcon className="w-3 h-3" /> {t('dashboard.vsLastMonth')}
          </p>
        </div>

        {/* Transactions */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-zinc-400">{t('dashboard.totalTransactions') || 'Total Transactions'}</h3>
            <ChartBarIcon className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tracking-tight">
              {summary?.totalTransactions != null
                ? summary.totalTransactions.toLocaleString()
                : <span className="inline-block w-16 h-7 bg-zinc-800 rounded animate-pulse" />}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">{t('dashboard.allTimeRewards') || 'All-time distributed rewards'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* POS Terminal */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl flex flex-col h-full shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-800/80">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-zinc-400" />
                {t('dashboard.cashbackTerminal') || 'Point of Sale Terminal'}
              </h2>
            </div>
            
            <div className="p-5 flex-1 flex flex-col space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  {t('dashboard.enterPurchaseAmount') || 'Transaction Amount (KZT)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₸</span>
                  <input
                    type="number"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all min-w-0"
                    placeholder="0.00"
                    value={posAmount}
                    onChange={(e) => setPosAmount(Number(e.target.value) || '')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 flex justify-between">
                  <span>{t('dashboard.scanCustomerQr') || 'Customer Wallet Address'}</span>
                </label>
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-300 text-sm font-mono focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder:text-zinc-600"
                    placeholder="UQ..."
                    value={clientWalletAddress}
                    onChange={(e) => setClientWalletAddress(e.target.value)}
                  />
                  <button
                    onClick={() => setShowScanner(true)}
                    className="shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2.5 rounded-lg transition-colors border border-zinc-700"
                    title="Scan QR"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 rounded-lg flex justify-between items-center mt-auto">
                <span className="text-sm text-zinc-400 truncate pr-2">{t('dashboard.cashbackReward') || 'Loyalty Reward'} (10%)</span>
                <span className="font-mono text-sm font-medium text-zinc-200 shrink-0">
                  +{Math.floor(Number(posAmount) * 0.1)} SWEET
                </span>
              </div>

              <button
                disabled={loading || !wallet || Number(posAmount) <= 0}
                onClick={handleTransfer}
                className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-lg hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {!wallet ? t('dashboard.connectWalletFirst') : (t('dashboard.processPayment') || 'Authorize Transaction')}
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 h-[420px] shadow-sm flex flex-col">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">{t('dashboard.ecosystemGrowth') || 'Transaction Volume'}</h3>
              <select
                className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-md px-2 py-1 outline-none"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value as 'day' | 'week' | 'month')}
              >
                <option value="day">Last 24h</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b', // zinc-900
                      border: '1px solid #27272a', // zinc-800
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
                    stroke="#a1a1aa" // zinc-400
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden relative shadow-2xl"
          >
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white text-sm">{t('dashboard.scannerTitle') || 'Scan Wallet QR'}</h3>
              <button onClick={() => setShowScanner(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-md p-1">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black relative aspect-square">
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
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
