import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { EcosystemService } from '../services/ecosystem';
import { useTonWallet } from '@tonconnect/ui-react';
import {
  BuildingLibraryIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Mock Data for the chart
const chartData = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 7000 },
  { name: 'Thu', value: 5000 },
  { name: 'Fri', value: 11000 },
  { name: 'Sat', value: 15420 },
  { name: 'Sun', value: 18900 },
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
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [posAmount, setPosAmount] = useState(1500);
  const wallet = useTonWallet();

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mint transaction error', { id: 'mint' });
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
    const cashback = Math.floor(purchaseAmt * 0.1);
    setLoading(true);
    try {
      toast.loading(`Transferring ${cashback} SWEET to client...`, { id: 'transfer' });
      await EcosystemService.transferToClient(cashback, wallet.account.address);
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
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-500">
            Sweet Loyalty
          </span>
        </h1>
        <p className="text-gray-500 mt-2 text-base">B2B Loyalty Token Management</p>
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
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BanknotesIcon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm text-gray-400 font-medium">Total Balance</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono">
                {balance ? balance.sweet.toLocaleString() : '—'}
              </span>
              <span className="text-purple-400 text-sm font-semibold">SWEET</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {balance ? `${balance.kztEquivalent.toLocaleString()} KZT` : '—'}
            </p>
          </GlassCard>
        </motion.div>

        {/* Governance */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm text-gray-400 font-medium">Voting Power</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-amber-400">
                {balance ? balance.gov : '—'}
              </span>
              <span className="text-amber-500/80 text-sm font-semibold">GOV</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">DAO Rights Active</p>
          </GlassCard>
        </motion.div>

        {/* Liquidity Pool */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <ChartBarIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-sm text-gray-400 font-medium">Staked Liquidity</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-cyan-400">
                {balance ? balance.lp.toLocaleString() : '—'}
              </span>
              <span className="text-cyan-500/80 text-sm font-semibold">LP</span>
            </div>
            <p className="text-xs text-green-500/80 mt-2">+25% APY</p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Demo Controls  — staggered entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10"
      >
        {/* B2B Mint */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-semibold">Partner Treasury</h3>
                <p className="text-xs text-gray-500 mt-0.5">Server-custodial demo wallet</p>
              </div>
              <span className="bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md text-xs font-mono">
                B2B
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Mint 5,000 SWEET to the partner treasury to simulate the platform distributing loyalty tokens to a registered confectionery.
            </p>
            <button
              onClick={handleMintTokens}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <BuildingLibraryIcon className="w-4 h-4" />
                  <span>Fund Partner Treasury</span>
                  <span className="ml-auto bg-white/15 px-2 py-0.5 rounded text-xs font-mono">
                    +5,000
                  </span>
                </>
              )}
            </button>
          </GlassCard>
        </motion.div>

        {/* B2C Transfer */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-semibold">POS Payment Simulation</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cashback transfer to client wallet</p>
              </div>
              <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-xs font-mono">
                B2C
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                  Purchase Amount (KZT)
                </label>
                <input
                  type="number"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="1500"
                  value={posAmount}
                  onChange={(e) => setPosAmount(Number(e.target.value))}
                />
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] px-4 py-3 rounded-xl flex justify-between items-center">
                <span className="text-xs text-gray-500">Cashback (10%)</span>
                <span className="font-mono text-sm font-semibold text-green-400">
                  +{Math.floor(posAmount * 0.1)} SWEET
                </span>
              </div>

              <button
                disabled={loading || !wallet || posAmount <= 0}
                onClick={handleTransfer}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCardIcon className="w-4 h-4" />
                {!wallet ? 'Connect wallet first' : 'Process Payment'}
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
          <h3 className="text-sm font-semibold text-gray-400 mb-6">Ecosystem Growth (TVL)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>
    </div>
  );
}
