import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

// Representative example activities — clearly labeled as examples
const activities = [
  { user: 'Partner', action: 'earned', amount: '150', token: 'SWEET', partner: 'Sweet Corner' },
  { user: 'Customer', action: 'claimed', amount: '', token: '10% Discount', partner: '' },
  { user: 'New Partner', action: 'joined', amount: '', token: 'Partner Network', partner: '' },
  { user: 'Customer', action: 'earned', amount: '500', token: 'SWEET', partner: 'Bakehouse' },
  { user: 'Partner', action: 'minted', amount: '10,000', token: 'SWEET', partner: '' },
];

export default function LiveActivity() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activity = activities[currentIndex];

  const getActionColor = (action: string) => {
    if (action === 'earned') return 'text-green-400';
    if (action === 'joined') return 'text-blue-400';
    return 'text-zinc-300';
  };

  const getActionEmoji = (action: string) => {
    if (action === 'earned') return '💰';
    if (action === 'claimed') return '🎁';
    if (action === 'joined') return '🤝';
    if (action === 'minted') return '✨';
    return '📌';
  };

  return (
    <div className="relative overflow-hidden bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowTrendingUpIcon className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Example Activity</span>
      </div>

      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span className="text-xl">{getActionEmoji(activity.action)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                <span className="font-semibold">{activity.user}</span>
                {' '}
                <span className={getActionColor(activity.action)}>{activity.action}</span>
                {activity.amount && (
                  <> <span className="font-mono font-bold">{activity.amount}</span></>
                )}
                {' '}
                <span className="text-zinc-400">{activity.token}</span>
                {activity.partner && (
                  <span className="text-zinc-600"> at {activity.partner}</span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
