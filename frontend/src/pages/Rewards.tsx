import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { TagIcon, GiftIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import RewardCard from '../components/RewardCard';
import { useRewards, useClaimReward, useBalance } from '../hooks/useApi';
import { useTelegram } from '../hooks/useTelegram';

const categories = [
  { key: 'all', label: 'All', icon: StarIcon },
  { key: 'DISCOUNT', label: 'Discounts', icon: TagIcon },
  { key: 'PRODUCT', label: 'Products', icon: GiftIcon },
  { key: 'CASHBACK', label: 'Cashback', icon: SparklesIcon },
];

export default function Rewards() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { hapticFeedback, showConfirm } = useTelegram();

  const { data: balanceData } = useBalance();
  const { data: rewardsData, isLoading } = useRewards(
    selectedCategory !== 'all' ? { category: selectedCategory } : undefined
  );
  const claimMutation = useClaimReward();

  const currentBalance = Number(balanceData?.data?.balance || 0);

  const rewards: {
    id: string;
    title: string;
    description: string;
    pointsRequired: string;
    category: 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
    available: number;
    isActive: boolean;
  }[] = rewardsData?.data || [];

  const filteredRewards =
    selectedCategory === 'all'
      ? rewards
      : rewards.filter((r) => r.category === selectedCategory);

  const handleClaim = async (rewardId: string) => {
    hapticFeedback('medium');
    const confirmed = await showConfirm('Are you sure you want to claim this reward?');
    if (confirmed) {
      hapticFeedback('success');
      claimMutation.mutate(rewardId);
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pl-1"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">Rewards</h1>
        <p className="text-zinc-400 mt-1">
          You have{' '}
          <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">
            {currentBalance.toLocaleString()}
          </span>{' '}
          points to spend
        </p>
      </motion.div>

      {/* Category Tabs */}
      <Tab.Group>
        <Tab.List className="flex gap-2 overflow-x-auto no-scrollbar mb-8 -mx-4 px-4 pb-2">
          {categories.map((category) => (
            <Tab
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={({ selected }) =>
                clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 focus:outline-none',
                  selected
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10'
                )
              }
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="card">
                      <div className="skeleton h-32 -mx-4 -mt-4 mb-4 rounded-t-2xl" />
                      <div className="skeleton h-6 w-3/4 mb-2" />
                      <div className="skeleton h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredRewards.length > 0 ? (
                <div className="grid gap-4">
                  {filteredRewards.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      {...reward}
                      currentBalance={currentBalance}
                      onClaim={handleClaim}
                      isClaimPending={claimMutation.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-accent-400">
                  <GiftIcon className="w-16 h-16 mx-auto mb-4 text-accent-200" />
                  <p className="text-lg font-medium">No rewards in this category</p>
                  <p className="text-sm">Check back later for new offers!</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
