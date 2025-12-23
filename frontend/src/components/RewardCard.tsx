import { motion } from 'framer-motion';
import { GiftIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface RewardCardProps {
  id: string;
  title: string;
  description?: string;
  pointsRequired: string;
  category: 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
  imageUrl?: string;
  available: number;
  isActive: boolean;
  currentBalance: number;
  onClaim: (id: string) => void;
  isClaimPending?: boolean;
}

const categoryIcons = {
  DISCOUNT: TagIcon,
  PRODUCT: GiftIcon,
  CASHBACK: SparklesIcon,
  SPECIAL: SparklesIcon,
};

const categoryColors = {
  DISCOUNT: 'bg-blue-100 text-blue-600',
  PRODUCT: 'bg-purple-100 text-purple-600',
  CASHBACK: 'bg-green-100 text-green-600',
  SPECIAL: 'bg-amber-100 text-amber-600',
};

export default function RewardCard({
  id,
  title,
  description,
  pointsRequired,
  category,
  imageUrl,
  available,
  isActive,
  currentBalance,
  onClaim,
  isClaimPending,
}: RewardCardProps) {
  const points = Number(pointsRequired);
  const canAfford = currentBalance >= points;
  const isAvailable = isActive && available > 0;
  const canClaim = canAfford && isAvailable && !isClaimPending;

  const CategoryIcon = categoryIcons[category];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'card overflow-hidden transition-all duration-200',
        !isAvailable && 'opacity-60'
      )}
    >
      {/* Image or placeholder */}
      <div className="relative h-32 -mx-4 -mt-4 mb-4 bg-gradient-to-br from-primary-100 to-accent-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GiftIcon className="w-16 h-16 text-primary-200" />
          </div>
        )}
        
        {/* Category badge */}
        <div
          className={clsx(
            'absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            categoryColors[category]
          )}
        >
          <CategoryIcon className="w-3.5 h-3.5" />
          {category}
        </div>

        {/* Availability badge */}
        {available > 0 && available <= 10 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            Only {available} left!
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-accent-800 text-lg">{title}</h3>
          {description && (
            <p className="text-sm text-accent-500 mt-1 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Points and action */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-2xl font-bold text-primary-600">
              {points.toLocaleString()}
            </span>
            <span className="text-sm text-accent-400 ml-1">pts</span>
          </div>

          <button
            onClick={() => onClaim(id)}
            disabled={!canClaim}
            className={clsx(
              'px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200',
              canClaim
                ? 'btn-primary'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {isClaimPending
              ? 'Claiming...'
              : !isAvailable
              ? 'Unavailable'
              : !canAfford
              ? `Need ${(points - currentBalance).toLocaleString()} more`
              : 'Claim'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}




