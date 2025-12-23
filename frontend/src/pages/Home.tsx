import { useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { SparklesIcon, GiftIcon, ChartBarIcon } from '@heroicons/react/24/outline';

import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';

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
  const [tonConnectUI] = useTonConnectUI();

  // Redirect to dashboard if wallet is connected
  useEffect(() => {
    if (wallet) {
      navigate('/dashboard');
    }
  }, [wallet, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-confetti-pattern opacity-30" />
      <div className="absolute top-20 -right-20 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-30" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-accent-200 rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 min-h-screen flex flex-col px-6 py-12 safe-area-inset-top">
        {/* Logo and header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl shadow-xl shadow-primary-300/40 mb-4">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-2">
            Sweet Loyalty
          </h1>
          <p className="text-accent-500 text-lg">
            Rewards for confectionery lovers
          </p>
        </motion.div>

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card-elevated bg-gradient-to-br from-white to-primary-50 p-6 mb-8 text-center"
        >
          <div className="animate-float mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl">
              <GiftIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-accent-800 mb-2">
            Start earning rewards today!
          </h2>
          <p className="text-accent-500 mb-6">
            Connect your TON wallet to join our loyalty program and start earning points at participating confectioneries.
          </p>
          
          <WalletConnect className="flex justify-center" />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-primary-100"
            >
              <div className="p-2.5 bg-primary-100 rounded-xl">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-accent-800">{feature.title}</h3>
                <p className="text-sm text-accent-500">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="mt-auto text-center">
          <p className="text-xs text-accent-400">
            Powered by TON Blockchain
          </p>
          <p className="text-xs text-accent-300 mt-1">
            AITU Diploma Project 2025
          </p>
        </div>
      </div>
    </div>
  );
}




