import { motion } from 'framer-motion';
import {
  ShoppingBagIcon,
  GiftIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface TransactionItemProps {
  id: string;
  amount: string;
  pointsEarned: string;
  type: 'PURCHASE' | 'BONUS' | 'REFERRAL' | 'PROMOTION' | 'REDEMPTION';
  description?: string;
  partnerName?: string;
  createdAt: string;
  index?: number;
}

const typeConfig = {
  PURCHASE: {
    icon: ShoppingBagIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Purchase',
    isPositive: true,
  },
  BONUS: {
    icon: SparklesIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Bonus',
    isPositive: true,
  },
  REFERRAL: {
    icon: UserGroupIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Referral',
    isPositive: true,
  },
  PROMOTION: {
    icon: GiftIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Promotion',
    isPositive: true,
  },
  REDEMPTION: {
    icon: GiftIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Redemption',
    isPositive: false,
  },
};

export default function TransactionItem({
  amount,
  pointsEarned,
  type,
  description,
  partnerName,
  createdAt,
  index = 0,
}: TransactionItemProps) {
  const config = typeConfig[type] || typeConfig.PURCHASE;
  const Icon = config.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0"
    >
      {/* Icon */}
      <div className={clsx('p-3 rounded-xl', config.bg)}>
        <Icon className={clsx('w-5 h-5', config.color)} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white tracking-tight">{config.label}</span>
          {description && (
            <span className="text-xs text-stone-400 truncate font-medium">{description}</span>
          )}
        </div>
        {partnerName && (
          <p className="text-xs text-stone-400 font-medium truncate mt-0.5">{partnerName}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
          <span>{formatDate(createdAt)}</span>
          <span className="w-1 h-1 bg-stone-700 rounded-full"></span>
          <span>{formatTime(createdAt)}</span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <div
          className={clsx(
            'flex items-center gap-1 font-bold',
            config.isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {config.isPositive ? (
            <ArrowUpIcon className="w-4 h-4" />
          ) : (
            <ArrowDownIcon className="w-4 h-4" />
          )}
          <span>
            {config.isPositive ? '+' : '-'}
            {Number(pointsEarned).toLocaleString()}
          </span>
        </div>
        {Number(amount) > 0 && (
          <div className="text-[11px] font-medium text-stone-500 mt-1">
            {(Number(amount) / 100).toLocaleString()} KZT
          </div>
        )}
      </div>
    </motion.div>
  );
}




