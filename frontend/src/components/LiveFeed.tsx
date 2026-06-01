import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as socketIO } from 'socket.io-client';

interface FeedItem {
  id: string;
  type: string;
  message: string;
  amount: number;
  timestamp: string;
}

const ICONS: Record<string, string> = {
  spin: '🎰',
  checkin: '📅',
  gift: '🎁',
  purchase: '🍰',
  redeem: '🎫',
};

// Seed data for demo (shown before real events arrive)
const SEED_FEED: FeedItem[] = [
  { id: 's1', type: 'purchase', message: 'Customer earned 120 SWEET at Panaderia', amount: 120, timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 's2', type: 'spin', message: 'Customer won 50 SWEET on Spin Wheel', amount: 50, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 's3', type: 'gift', message: 'Customer sent 25 SWEET as a gift', amount: 25, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 's4', type: 'checkin', message: 'Customer claimed daily bonus (+20 SWEET, 5 day streak)', amount: 20, timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 's5', type: 'purchase', message: 'Customer earned 80 SWEET at Home Macaron', amount: 80, timestamp: new Date(Date.now() - 1500000).toISOString() },
];

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(SEED_FEED);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Connect to Socket.IO for real events
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('activity:new', (data: Omit<FeedItem, 'id'>) => {
      const newItem: FeedItem = { ...data, id: `live-${Date.now()}` };
      setItems(prev => [newItem, ...prev].slice(0, 20));
      setCurrentIdx(0);
    });

    return () => { socket.disconnect(); };
  }, []);

  // Auto-rotate through feed items
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % Math.min(items.length, 5));
    }, 3500);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIdx];
  if (!current) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-stone-800/60 bg-stone-900/50">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">Live Activity</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + currentIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2.5 px-3 py-2.5"
        >
          <span className="text-base flex-shrink-0">{ICONS[current.type] || '💫'}</span>
          <p className="text-[11px] text-stone-400 flex-1 truncate">{current.message}</p>
          <span className="text-[10px] text-stone-600 flex-shrink-0">{timeAgo(current.timestamp)}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
