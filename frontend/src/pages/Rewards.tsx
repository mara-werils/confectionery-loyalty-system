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

  // Mock rewards for demo
  const rewards = rewardsData?.data || [
    {
      id: '1',
      title: '10% Discount',
      description: 'Get 10% off your next order at any partner confectionery',
      pointsRequired: '100',
      category: 'DISCOUNT' as const,
      available: 999,
      isActive: true,
    },
    {
      id: '2',
      title: 'Free Cake Slice',
      description: 'Redeem for a free slice of any cake',
      pointsRequired: '250',
      category: 'PRODUCT' as const,
      available: 50,
      isActive: true,
    },
    {
      id: '3',
      title: '5% Cashback',
      description: 'Get 5% cashback on your next purchase',
      pointsRequired: '500',
      category: 'CASHBACK' as const,
      available: 200,
      isActive: true,
    },
    {
      id: '4',
      title: '25% Discount',
      description: 'Quarter off your order',
      pointsRequired: '300',
      category: 'DISCOUNT' as const,
      available: 100,
      isActive: true,
    },
    {
      id: '5',
      title: 'Box of Chocolates',
      description: 'Premium box of assorted chocolates',
      pointsRequired: '750',
      category: 'PRODUCT' as const,
      available: 25,
      isActive: true,
    },
    {
      id: '6',
      title: 'VIP Tasting Event',
      description: 'Exclusive access to our VIP tasting event',
      pointsRequired: '1000',
      category: 'SPECIAL' as const,
      available: 10,
      isActive: true,
    },
  ];

  const filteredRewards =
    selectedCategory === 'all'
      ? rewards
      : rewards.filter((r: typeof rewards[0]) => r.category === selectedCategory);

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
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-accent-800">Rewards</h1>
        <p className="text-accent-500">
          You have{' '}
          <span className="font-bold text-primary-600">
            {currentBalance.toLocaleString()}
          </span>{' '}
          points to spend
        </p>
      </motion.div>

      {/* Category Tabs */}
      <Tab.Group>
        <Tab.List className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-4 px-4">
          {categories.map((category) => (
            <Tab
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={({ selected }) =>
                clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 focus:outline-none',
                  selected
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-300/30'
                    : 'bg-white text-accent-600 hover:bg-primary-50'
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
                  {filteredRewards.map((reward: typeof rewards[0]) => (
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




