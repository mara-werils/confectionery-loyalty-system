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
  createdAt: string;
  index?: number;
}

const typeConfig = {
  PURCHASE: {
    icon: ShoppingBagIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    label: 'Purchase',
    isPositive: true,
  },
  BONUS: {
    icon: SparklesIcon,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    label: 'Bonus',
    isPositive: true,
  },
  REFERRAL: {
    icon: UserGroupIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    label: 'Referral',
    isPositive: true,
  },
  PROMOTION: {
    icon: GiftIcon,
    color: 'text-green-500',
    bg: 'bg-green-50',
    label: 'Promotion',
    isPositive: true,
  },
  REDEMPTION: {
    icon: GiftIcon,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: 'Redemption',
    isPositive: false,
  },
};

export default function TransactionItem({
  id,
  amount,
  pointsEarned,
  type,
  description,
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
      className="flex items-center gap-4 py-4 border-b border-primary-50 last:border-0"
    >
      {/* Icon */}
      <div className={clsx('p-3 rounded-xl', config.bg)}>
        <Icon className={clsx('w-5 h-5', config.color)} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent-800">{config.label}</span>
          {description && (
            <span className="text-xs text-accent-400 truncate">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-accent-400 mt-0.5">
          <span>{formatDate(createdAt)}</span>
          <span>•</span>
          <span>{formatTime(createdAt)}</span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <div
          className={clsx(
            'flex items-center gap-1 font-bold',
            config.isPositive ? 'text-success-600' : 'text-red-500'
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
          <div className="text-xs text-accent-400 mt-0.5">
            {(Number(amount) / 100).toLocaleString()} KZT
          </div>
        )}
      </div>
    </motion.div>
  );
}




