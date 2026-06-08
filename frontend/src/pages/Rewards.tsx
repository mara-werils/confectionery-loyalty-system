import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { TagIcon, GiftIcon, SparkleIcon, StarIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import RewardCard from '../components/RewardCard';
import { useRewards, useClaimReward, useBalance } from '../hooks/useApi';
import { useTelegram } from '../hooks/useTelegram';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Rewards() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { hapticFeedback, showConfirm } = useTelegram();

  const categories = [
    { key: 'all', label: t('rewards.categories.all'), icon: StarIcon },
    { key: 'DISCOUNT', label: t('rewards.categories.discount'), icon: TagIcon },
    { key: 'PRODUCT', label: t('rewards.categories.product'), icon: GiftIcon },
    { key: 'CASHBACK', label: t('rewards.categories.cashback'), icon: SparkleIcon },
  ];

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
    const confirmed = await showConfirm(t('rewards.confirmClaim'));
    if (confirmed) {
      hapticFeedback('success');
      claimMutation.mutate(rewardId);
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 pl-1"
      >
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: 'var(--sweet-text)' }}
        >
          {t('rewards.title')}
        </h1>

        {/* Balance pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--sweet-accent-dim)' }}
          >
            <SparkleIcon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('rewards.youHave')}
            </p>
            <p className="text-xl font-bold leading-tight" style={{ color: 'var(--sweet-text)' }}>
              {currentBalance.toLocaleString()}
              <span
                className="text-sm font-medium ml-1.5"
                style={{ color: 'var(--sweet-text-secondary)' }}
              >
                {t('rewards.pointsForExchange')}
              </span>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Category Tabs */}
      <Tab.Group>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <Tab.List className="flex gap-2 overflow-x-auto no-scrollbar mb-8 -mx-4 px-4 pb-1">
            {categories.map((category) => (
              <Tab
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none"
                style={selectedCategory === category.key
                  ? { background: 'var(--sweet-text)', color: 'var(--sweet-bg)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }
                  : { background: 'var(--sweet-card)', color: 'var(--sweet-text-muted)', border: '1px solid var(--sweet-border)' }
                }
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </Tab>
            ))}
          </Tab.List>
        </motion.div>

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
                <motion.div
                  className="grid gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredRewards.map((reward) => (
                    <motion.div key={reward.id} variants={itemVariants}>
                      <RewardCard
                        {...reward}
                        currentBalance={currentBalance}
                        onClaim={handleClaim}
                        isClaimPending={claimMutation.isPending}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center py-16 px-6 rounded-2xl"
                  style={{
                    background: 'var(--sweet-card)',
                    border: '1px solid var(--sweet-border)',
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                    style={{ background: 'var(--sweet-card-hover)', border: '1px solid var(--sweet-border)' }}
                  >
                    <GiftIcon className="w-10 h-10" style={{ color: 'var(--sweet-text-faint)' }} />
                  </div>
                  <p
                    className="text-lg font-bold mb-1"
                    style={{ color: 'var(--sweet-text)' }}
                  >
                    {t('rewards.emptyTitle')}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('rewards.emptySubtitle')}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
