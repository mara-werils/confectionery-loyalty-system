import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from '../../components/GlassCard';
import toast from 'react-hot-toast';

const rewards = [
  {
    id: '1',
    title: '10% Discount',
    description: 'Get 10% off your next order at any partner confectionery',
    pointsRequired: 100,
    category: 'DISCOUNT',
    icon: TagIcon,
    available: 999,
  },
  {
    id: '2',
    title: 'Free Cake Slice',
    description: 'Redeem for a free slice of any cake',
    pointsRequired: 250,
    category: 'PRODUCT',
    icon: GiftIcon,
    available: 50,
  },
  {
    id: '3',
    title: '5% Cashback Boost',
    description: 'Get 5% extra cashback on your next purchase',
    pointsRequired: 500,
    category: 'CASHBACK',
    icon: SparklesIcon,
    available: 200,
  },
  {
    id: '4',
    title: '25% Discount',
    description: 'Quarter off your order at any partner',
    pointsRequired: 300,
    category: 'DISCOUNT',
    icon: TagIcon,
    available: 100,
  },
  {
    id: '5',
    title: 'Box of Chocolates',
    description: 'Premium box of assorted chocolates',
    pointsRequired: 750,
    category: 'PRODUCT',
    icon: GiftIcon,
    available: 25,
  },
  {
    id: '6',
    title: 'VIP Tasting Event',
    description: 'Exclusive access to our VIP tasting event',
    pointsRequired: 1000,
    category: 'SPECIAL',
    icon: SparklesIcon,
    available: 10,
  },
];

export default function CustomerRewards() {
  const navigate = useNavigate();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const handleRedeem = async (reward: typeof rewards[0]) => {
    setRedeeming(reward.id);
    // Simulate burn transaction
    await new Promise(r => setTimeout(r, 1500));
    toast.success(`🎉 Redeemed "${reward.title}"! Show this to the cashier.`);
    setRedeeming(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Rewards Catalog</h1>
        <p className="text-zinc-400 mt-1 text-sm">Exchange SWEET for real rewards</p>
      </motion.div>

      {/* Rewards Grid */}
      <div className="space-y-3">
        <AnimatePresence>
          {rewards.map((reward, i) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-5 border border-white/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-xl ring-1 ring-white/10 shrink-0">
                    <reward.icon className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{reward.title}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{reward.description}</p>
                      </div>
                      <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg font-mono text-zinc-300 whitespace-nowrap">
                        {reward.pointsRequired} SWEET
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-zinc-500">
                        {reward.available} available
                      </span>
                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={redeeming === reward.id}
                        className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40"
                      >
                        {redeeming === reward.id ? (
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          'Redeem'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
