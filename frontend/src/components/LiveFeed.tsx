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
  spin: '◆',
  checkin: '●',
  gift: '→',
  purchase: '↑',
  redeem: '★',
};

// Seed data for demo (shown before real events arrive)
const SEED_FEED: FeedItem[] = [
  { id: 's1', type: 'purchase', message: '+120 SWEET earned at Panaderia', amount: 120, timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 's2', type: 'spin', message: '+50 SWEET won on Spin Wheel', amount: 50, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 's3', type: 'gift', message: '25 SWEET gifted to a friend', amount: 25, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 's4', type: 'checkin', message: '+20 SWEET daily bonus (5 day streak)', amount: 20, timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 's5', type: 'purchase', message: '+80 SWEET earned at Home Macaron', amount: 80, timestamp: new Date(Date.now() - 1500000).toISOString() },
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
    <div
      className="mb-4 overflow-hidden rounded-xl sweet-shimmer"
      style={{
        border: '1px solid var(--sweet-border)',
        background: 'var(--sweet-card)',
      }}
    >
      {/* Header strip */}
      <div
        className="flex items-center gap-1.5 px-3 py-1"
        style={{ background: 'var(--sweet-accent-dim)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#4ade80',
            boxShadow: '0 0 6px rgba(74, 222, 128, 0.6)',
            animation: 'pulse-soft 2s ease-in-out infinite',
          }}
        />
        <span
          className="text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--sweet-text-muted)' }}
        >
          Live Activity
        </span>
      </div>

      {/* Feed row */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + currentIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2.5 px-3 py-2.5"
        >
          <span
            className="text-base flex-shrink-0"
            style={{ color: 'var(--sweet-accent)' }}
          >
            {ICONS[current.type] || '◈'}
          </span>
          <p
            className="text-[11px] flex-1 truncate"
            style={{ color: 'var(--sweet-text-secondary)' }}
          >
            {current.message}
          </p>
          <span
            className="text-[10px] flex-shrink-0 tabular-nums"
            style={{ color: 'var(--sweet-text-faint)' }}
          >
            {timeAgo(current.timestamp)}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
