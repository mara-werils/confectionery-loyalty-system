import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

// Simulated live activities
const activities = [
    { user: 'Alex K.', action: 'earned', amount: '150', token: 'SWEET', partner: 'Sweet Corner' },
    { user: 'Maria S.', action: 'claimed', amount: '', token: '10% Discount', partner: '' },
    { user: 'Cafe Almaty', action: 'joined', amount: '', token: 'Partner Network', partner: '' },
    { user: 'John D.', action: 'staked', amount: '2,000', token: 'LP', partner: '' },
    { user: 'Elena V.', action: 'earned', amount: '500', token: 'SWEET', partner: 'Bakehouse' },
    { user: 'Sweet Delights', action: 'minted', amount: '10,000', token: 'SWEET', partner: '' },
    { user: 'Timur A.', action: 'swapped', amount: '1,000', token: 'SWEET → KZT', partner: '' },
    { user: 'Pastry Palace', action: 'joined', amount: '', token: 'Partner Network', partner: '' },
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
        switch (action) {
            case 'earned': return 'text-green-400';
            case 'claimed': return 'text-purple-400';
            case 'joined': return 'text-blue-400';
            case 'staked': return 'text-cyan-400';
            case 'minted': return 'text-amber-400';
            case 'swapped': return 'text-pink-400';
            default: return 'text-gray-400';
        }
    };

    const getActionEmoji = (action: string) => {
        switch (action) {
            case 'earned': return '💰';
            case 'claimed': return '🎁';
            case 'joined': return '🤝';
            case 'staked': return '📈';
            case 'minted': return '✨';
            case 'swapped': return '🔄';
            default: return '📌';
        }
    };

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Activity</span>
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-400 ml-auto" />
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
                                {' '}
                                {activity.amount && (
                                    <span className="font-mono font-bold">{activity.amount}</span>
                                )}
                                {' '}
                                <span className="text-gray-300">{activity.token}</span>
                                {activity.partner && (
                                    <span className="text-gray-500"> at {activity.partner}</span>
                                )}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
