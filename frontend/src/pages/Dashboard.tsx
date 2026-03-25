import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { EcosystemService } from '../services/ecosystem';
import { useTonWallet } from '@tonconnect/ui-react';
import {
  BuildingLibraryIcon,
  ChartBarIcon,
  CpuChipIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  BoltIcon,
  QrCodeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Mock Data for the chart
const chartData = [
  { name: 'Mon', value: 4000, churnRisk: 12 },
  { name: 'Tue', value: 3000, churnRisk: 15 },
  { name: 'Wed', value: 7000, churnRisk: 11 },
  { name: 'Thu', value: 5000, churnRisk: 14 },
  { name: 'Fri', value: 11000, churnRisk: 8 },
  { name: 'Sat', value: 15420, churnRisk: 5 },
  { name: 'Sun', value: 18900, churnRisk: 4 },
];

// Framer Motion variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Dashboard() {
  const [balance, setBalance] = useState<{ sweet: number; kztEquivalent: number; gov: number; lp: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState(1500);
  const wallet = useTonWallet();
  const [clientWalletAddress, setClientWalletAddress] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (wallet && !clientWalletAddress) {
      setClientWalletAddress(wallet.account.address);
    }
  }, [wallet]);

  const loadData = async () => {
    const bal = await EcosystemService.getBalance();
    setBalance(bal);
  };

  const handleMintTokens = async () => {
    if (!wallet) {
      toast.error('Connect your TON wallet first');
      return;
    }
    setLoading(true);
    try {
      toast.loading('Broadcasting mint transaction...', { id: 'mint' });
      const res = await EcosystemService.mintTokens(5000, wallet.account.address);
      if (res.success) {
        toast.success('Mint broadcasted successfully', { id: 'mint' });
      } else {
        toast.error('Mint broadcast failed', { id: 'mint' });
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      toast.error(err.response?.data?.message || 'Mint transaction error', { id: 'mint' });
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    if (!wallet) return;
    const purchaseAmt = posAmount;
    if (purchaseAmt <= 0) {
      toast.error('Enter a valid purchase amount');
      return;
    }
    if (!clientWalletAddress) {
      toast.error('Enter a client wallet address');
      return;
    }
    const cashback = Math.floor(purchaseAmt * 0.1);
    setLoading(true);
    try {
      toast.loading(`Transferring ${cashback} SWEET to client...`, { id: 'transfer' });
      await EcosystemService.transferToClient(cashback, clientWalletAddress);
      toast.success(`${cashback} SWEET sent to client wallet`, { id: 'transfer' });
    } catch {
      toast.error('Transfer failed', { id: 'transfer' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-10"
      >
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          <span className="text-white">
            Sweet Loyalty
          </span>
        </h1>
        <p className="text-zinc-400 mt-2 text-base">B2B Loyalty Token Management</p>
      </motion.div>

      {/* Stats Grid — staggered entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
      >
        {/* Token Balance */}
        <motion.div variants={itemVariants}>
          <GlassCard className="relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10">
                <BuildingLibraryIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <h3 className="text-sm text-zinc-400 font-medium">Treasury Holdings (SWEET)</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                {balance ? balance.sweet.toLocaleString() : '15,420'}
              </span>
            </div>
            <p className="text-xs text-green-400 mt-2 font-medium">
              +12% vs last month
            </p>
          </GlassCard>
        </motion.div>

        {/* Governance */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10">
                <UserGroupIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <h3 className="text-sm text-zinc-400 font-medium">Active Customers</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                1,284
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Unique wallets engaged</p>
          </GlassCard>
        </motion.div>

        {/* Liquidity Pool */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10">
                <CpuChipIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <h3 className="text-sm text-zinc-400 font-medium">AI Churn Prediction</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-orange-400">
                14.2%
              </span>
            </div>
            <p className="text-xs text-orange-400/80 mt-2 flex items-center gap-1 group">
              <ExclamationTriangleIcon className="w-3 h-3" />
              Elevated risk for Tier-2 cohort
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* AI Prescriptive Engine — staggered entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10"
      >
        {/* Urgent AI Action */}
        <motion.div variants={itemVariants}>
          <GlassCard className="border-orange-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
            
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
                  <CpuChipIcon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Intelligence Alert</h3>
                  <p className="text-xs text-orange-400/80 mt-0.5">High probability churn detected</p>
                </div>
              </div>
              <span className="bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-pulse">
                Action Required
              </span>
            </div>
            
            <div className="bg-black/20 rounded-xl p-4 mb-5 border border-white/5 relative z-10">
              <p className="text-sm text-zinc-300 leading-relaxed font-mono">
                <span className="text-orange-400">» Analysis:</span> Weekend foot traffic is predicted to drop 15% due to incoming weather. 42 high-value customers "Bronze Tier" have not visited in 14 days and are at 85% risk of churn.
              </p>
            </div>

            <button
              onClick={handleMintTokens}
              disabled={loading}
              className="relative z-10 w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-white text-black hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Executing Core Logic...'
              ) : (
                <>
                  <BoltIcon className="w-4 h-4" />
                  <span>Execute Airdrop: 500 SWEET to Cohort</span>
                </>
              )}
            </button>
          </GlassCard>
        </motion.div>

        {/* AI Growth Suggestion */}
        <motion.div variants={itemVariants}>
          <GlassCard className="border-white/5 relative overflow-hidden">
             <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10">
                  <ChartBarIcon className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Growth Opportunity</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Automated optimization</p>
                </div>
              </div>
              <span className="bg-white/5 text-zinc-400 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-white/10">
                Suggestion
              </span>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-5 border border-white/5 relative z-10">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Customers who hold &gt;1,000 SWEET have a 3x higher Lifetime Value. Consider unlocking a temporary 20% cashback boost for payments made via Telegram Mini App to drive immediate liquidity.
              </p>
            </div>

            <button
              disabled={true}
              className="relative z-10 w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-semibold text-sm bg-transparent border border-white/10 text-zinc-400 transition-all duration-200"
            >
                <span>Deploy Smart Contract Override</span>
                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">Locked</span>
            </button>

          </GlassCard>
        </motion.div>
      </motion.div>

      {/* POS Simulation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-5 mb-10"
      >
        <motion.div variants={itemVariants}>
          <GlassCard className="border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-5 relative z-10">
               <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10">
                  <CreditCardIcon className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">POS Payment Simulation</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Cashback transfer to client wallet</p>
                </div>
              </div>
              <span className="bg-white/5 text-zinc-300 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-white/10">
                B2C Demo
              </span>
            </div>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Scan & Pay Amount (KZT)
                </label>
                <input
                  type="number"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="1500"
                  value={posAmount}
                  onChange={(e) => setPosAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Client Wallet Address (QR Scan)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-zinc-400 text-xs font-mono focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="0Q..."
                    value={clientWalletAddress}
                    onChange={(e) => setClientWalletAddress(e.target.value)}
                  />
                  <button
                    onClick={() => setShowScanner(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Scan QR Code"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 px-4 py-3 rounded-xl flex justify-between items-center">
                <span className="text-xs text-zinc-500">Cashback Reward (10%)</span>
                <span className="font-mono text-sm font-semibold text-green-400">
                  +{Math.floor(posAmount * 0.1)} SWEET
                </span>
              </div>

              <button
                disabled={loading || !wallet || posAmount <= 0}
                onClick={handleTransfer}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-white text-black hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCardIcon className="w-4 h-4" />
                {!wallet ? 'Connect wallet first' : 'Process Payment & Airdrop'}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
      >
        <GlassCard className="h-[360px]">
          <h3 className="text-sm font-semibold text-zinc-400 mb-6">Ecosystem Growth (TVL)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e4e4e7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#e4e4e7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#3f3f46" tick={{ fontSize: 12 }} />
              <YAxis stroke="#3f3f46" tick={{ fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  fontSize: '13px',
                }}
                itemStyle={{ color: '#d4d4d8' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#e4e4e7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <h3 className="font-semibold text-white">Scan Client QR</h3>
              <button onClick={() => setShowScanner(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full p-1">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black relative aspect-square">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    let address = result[0].rawValue;
                    // Parse typical TON URI scheme if present: ton://transfer/<address>
                    if (address.startsWith('ton://transfer/')) {
                       address = address.replace('ton://transfer/', '').split('?')[0];
                    }
                    setClientWalletAddress(address);
                    setShowScanner(false);
                    toast.success('Wallet address captured!');
                  }
                }}
              />
            </div>
            <div className="p-4 bg-zinc-900 text-center text-xs text-zinc-400">
              Show a TON Wallet QR code to the camera
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
