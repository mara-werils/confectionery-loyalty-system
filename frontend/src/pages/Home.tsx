
import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { SparklesIcon, GiftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';

const features = [
  {
    icon: SparklesIcon,
    title: 'Earn Points',
    description: 'Get loyalty points on every purchase at partner confectioneries',
  },
  {
    icon: GiftIcon,
    title: 'Redeem Rewards',
    description: 'Exchange points for discounts, free products, and exclusive offers',
  },
  {
    icon: ChartBarIcon,
    title: 'Track Progress',
    description: 'Monitor your earnings and climb the tier ladder for better rewards',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const wallet = useTonWallet();

  // Redirect to dashboard if wallet is connected
  useEffect(() => {
    if (wallet) {
      navigate('/dashboard');
    }
  }, [wallet, navigate]);

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col items-center justify-center p-6">

      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center">

        {/* Logo and header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-2xl shadow-purple-500/30 mb-6">
            <SparklesIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">
              Sweet
            </span>{' '}
            Loyalty
          </h1>
          <p className="text-gray-400 text-lg">
            The future of rewards. Powered by TON.
          </p>
        </motion.div>

        {/* Hero section */}
        <GlassCard className="w-full mb-12 p-8 border-t border-white/10" delay={0.1}>
          <div className="mb-6 inline-flex p-4 bg-white/5 rounded-2xl ring-1 ring-white/10">
            <GiftIcon className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Start Earning Crypto
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Connect your wallet to unlock exclusive tiers, trade rewards, and participate in the ecosystem.
          </p>

          <div className="flex justify-center transform scale-110">
            <WalletConnect />
          </div>
        </GlassCard>

        {/* Features */}
        <div className="grid gap-4 w-full">
          {features.map((feature, index) => (
            <GlassCard
              key={feature.title}
              delay={0.2 + index * 0.1}
              className="flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
                <feature.icon className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-bold text-white">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
