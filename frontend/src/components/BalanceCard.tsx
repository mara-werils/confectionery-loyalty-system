import { motion } from 'framer-motion';
import { SparkleIcon, TrendUpIcon } from '@phosphor-icons/react';
import clsx from 'clsx';

interface BalanceCardProps {
  balance: string;
  lifetimeEarned: string;
  lifetimeRedeemed: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  isLoading?: boolean;
}

const tierStyles = {
  BRONZE: {
    gradient: 'from-stone-900 to-stone-950 border border-stone-800',
    glow: 'shadow-none',
    badge: 'bg-stone-800 text-stone-400 border border-stone-700',
  },
  SILVER: {
    gradient: 'from-stone-800 to-stone-900 border border-stone-700',
    glow: 'shadow-lg shadow-stone-900/50',
    badge: 'bg-stone-700 text-stone-300 border border-stone-600',
  },
  GOLD: {
    gradient: 'from-stone-900 via-stone-800 to-stone-900 border border-white/10',
    glow: 'shadow-xl shadow-white/5',
    badge: 'bg-white/10 text-white border border-white/20',
  },
};

export default function BalanceCard({
  balance,
  lifetimeEarned,
  lifetimeRedeemed,
  tier,
  isLoading,
}: BalanceCardProps) {
  const styles = tierStyles[tier];

  if (isLoading) {
    return (
      <div className="card-elevated bg-gradient-to-br from-primary-100 to-accent-50 p-6">
        <div className="skeleton h-8 w-32 mb-4" />
        <div className="skeleton h-12 w-48 mb-6" />
        <div className="flex gap-4">
          <div className="skeleton h-16 flex-1 rounded-xl" />
          <div className="skeleton h-16 flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'relative overflow-hidden rounded-3xl p-6',
        'bg-gradient-to-br',
        styles.gradient,
        'shadow-xl',
        styles.glow
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform -translate-x-8 translate-y-8" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SparkleIcon weight="fill" className="w-5 h-5 text-white/80" />
            <span className="text-white/80 font-medium">Баллы лояльности</span>
          </div>
          <span
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-bold',
              styles.badge
            )}
          >
            {tier}
          </span>
        </div>

        {/* Balance */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <span className="text-5xl font-bold text-white tracking-tight">
            {Number(balance).toLocaleString()}
          </span>
          <span className="text-white/70 ml-2 text-lg">pts</span>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendUpIcon weight="fill" className="w-4 h-4 text-white/70" />
              <span className="text-xs text-white/70">Получено</span>
            </div>
            <span className="text-lg font-bold text-white">
              {Number(lifetimeEarned).toLocaleString()}
            </span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <SparkleIcon weight="fill" className="w-4 h-4 text-white/70" />
              <span className="text-xs text-white/70">Потрачено</span>
            </div>
            <span className="text-lg font-bold text-white">
              {Number(lifetimeRedeemed).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}












