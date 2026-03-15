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
  DISCOUNT: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  PRODUCT: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  CASHBACK: 'bg-green-500/10 text-green-400 border border-green-500/20',
  SPECIAL: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
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
        'glass-panel p-4 overflow-hidden transition-all duration-200 flex flex-col',
        !isAvailable && 'opacity-60 grayscale'
      )}
    >
      {/* Image or placeholder */}
      <div className="relative h-36 -mx-4 -mt-4 mb-4 bg-zinc-800/50 overflow-hidden border-b border-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GiftIcon className="w-16 h-16 text-zinc-700" />
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
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white text-lg tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Points and action */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
              {points.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-500 ml-1 font-medium">pts</span>
          </div>

          <button
            onClick={() => onClaim(id)}
            disabled={!canClaim}
            className={clsx(
              'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300',
              canClaim
                ? 'glass-button-primary'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
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












