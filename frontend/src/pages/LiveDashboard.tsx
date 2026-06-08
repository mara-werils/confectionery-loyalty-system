/**
 * Live Ecosystem Pulse Dashboard — /live
 * Public page, no authentication required.
 * Shows real-time ecosystem metrics powered by Socket.IO + polling.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { io as SocketIO, Socket } from 'socket.io-client';
import {
  BoltIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { api } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PublicStats {
  totalPartners: number;
  totalSweetIssued: string;
  todayTransactions: number;
  allTimeTransactions: number;
  todayInterventions: number;
  totalInterventions: number;
  activeProposals: number;
  totalProposals: number;
  chartData: { hour: string; label: string; tokens: number }[];
  feed: { id: string; type: string; message: string; amount: string; company: string; timestamp: string }[];
  updatedAt: string;
}

interface FeedEvent {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  amount?: string;
}

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                   */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ value, prefix = '', suffix = '', className = '' }: {
  value: number; prefix?: string; suffix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;
    const controls = animate(from, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: v => {
        if (ref.current) {
          ref.current.textContent = prefix + Math.round(v).toLocaleString() + suffix;
        }
      },
    });
    return controls.stop;
  }, [value, prefix, suffix]);

  return <span ref={ref} className={className}>{prefix}{value.toLocaleString()}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Live Pulse Dot                                                     */
/* ------------------------------------------------------------------ */

function PulseDot({ color = '#f59e0b' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
        animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Event type styles                                                  */
/* ------------------------------------------------------------------ */

const EVENT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  PURCHASE:         { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Purchase' },
  BONUS:            { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'Bonus' },
  REFERRAL:         { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Referral' },
  PROMOTION:        { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'Promo' },
  intervention:     { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', label: 'AI Save' },
  churn_intervention: { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', label: 'AI Save' },
  spin:             { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Spin' },
};

function getEventStyle(type: string) {
  return EVENT_STYLES[type] ?? { color: 'var(--sweet-accent)', bg: 'rgba(245,158,11,0.10)', label: type };
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';

export default function LiveDashboard() {
  const [liveFeed, setLiveFeed] = useState<FeedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /* ---- Polling public stats every 20s ---- */
  const { data: stats, isLoading } = useQuery<PublicStats>({
    queryKey: ['public', 'stats'],
    queryFn: () => (api.public.getStats() as any).then((r: any) => r.data ?? r),
    refetchInterval: 20000,
  });

  /* ---- Socket.IO real-time feed ---- */
  useEffect(() => {
    const socket = SocketIO(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    const handleEvent = (data: any) => {
      const event: FeedEvent = {
        id: data.id || Math.random().toString(36).slice(2),
        message: data.message || `${data.companyName || 'User'} — ${data.type}`,
        type: data.type || 'PURCHASE',
        timestamp: data.timestamp || new Date().toISOString(),
        amount: data.amount || data.bonusSent?.toString(),
      };
      setLiveFeed(prev => [event, ...prev].slice(0, 20));
    };

    socket.on('activity:new', handleEvent);
    socket.on('pulse:intervention', handleEvent);
    socket.on('governance:vote_cast', (data: any) => {
      handleEvent({
        ...data,
        type: 'BONUS',
        message: `DAO vote cast: ${data.choice} with ${Number(data.votingPower).toLocaleString()} SWEET`,
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  /* ---- Seed feed from DB on first load ---- */
  useEffect(() => {
    if (stats?.feed && liveFeed.length === 0) {
      setLiveFeed(stats.feed.map(f => ({
        id: f.id,
        message: f.message,
        type: f.type,
        timestamp: f.timestamp,
        amount: f.amount,
      })));
    }
  }, [stats?.feed]);

  /* ---- Derived values ---- */
  const totalSweet = stats ? Number(stats.totalSweetIssued) : 0;
  const chartData = stats?.chartData ?? [];

  return (
    <div
      className="min-h-screen p-4 pb-10"
      style={{ background: 'var(--sweet-bg, #0d0b0a)', color: 'var(--sweet-text)' }}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* -------- Header -------- */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between pt-2"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"
              style={{ color: 'var(--sweet-text)' }}>
              <SignalIcon className="w-7 h-7" style={{ color: '#f59e0b' }} />
              Ecosystem Pulse
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
              Live · Sweet Loyalty Network
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PulseDot color={isConnected ? '#34d399' : '#f87171'} />
            <span className="text-xs font-medium"
              style={{ color: isConnected ? '#34d399' : '#f87171' }}>
              {isConnected ? 'LIVE' : 'Connecting...'}
            </span>
          </div>
        </motion.div>

        {/* -------- Main KPI Cards -------- */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'SWEET Issued',
              value: totalSweet,
              suffix: '',
              icon: CurrencyDollarIcon,
              color: '#f59e0b',
              accent: 'rgba(245,158,11,0.12)',
              sub: 'all-time tokens minted',
            },
            {
              label: 'Active Members',
              value: stats?.totalPartners ?? 0,
              suffix: '',
              icon: UserGroupIcon,
              color: '#34d399',
              accent: 'rgba(52,211,153,0.12)',
              sub: 'registered partners',
            },
            {
              label: "Today's Txns",
              value: stats?.todayTransactions ?? 0,
              suffix: '',
              icon: BoltIcon,
              color: '#60a5fa',
              accent: 'rgba(96,165,250,0.12)',
              sub: `${(stats?.allTimeTransactions ?? 0).toLocaleString()} all-time`,
            },
            {
              label: 'AI Interventions',
              value: stats?.todayInterventions ?? 0,
              suffix: '',
              icon: SparklesIcon,
              color: '#fb7185',
              accent: 'rgba(251,113,133,0.12)',
              sub: `${(stats?.totalInterventions ?? 0)} total saves`,
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: card.accent }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                {isLoading && (
                  <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"
                    style={{ color: card.color }} />
                )}
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--sweet-text)' }}>
                <AnimatedCounter value={card.value} />
              </div>
              <div className="text-[11px] mt-0.5 font-medium" style={{ color: card.color }}>
                {card.label}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>
                {card.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* -------- DAO + AI Banner -------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="rounded-2xl p-4 flex items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(167,139,250,0.08))',
            border: '1px solid rgba(245,158,11,0.20)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)' }}>
              <ShieldCheckIcon className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
                {stats?.activeProposals ?? 0} Active DAO Proposal{stats?.activeProposals !== 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                {stats?.totalProposals ?? 0} total · token-weighted governance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(251,113,133,0.12)' }}>
              <ArrowTrendingUpIcon className="w-5 h-5" style={{ color: '#fb7185' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
                {stats?.todayInterventions ?? 0} AI Saves Today
              </p>
              <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                Auto churn prevention
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------- 24h SWEET Issuance Chart -------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="rounded-2xl p-5"
          style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
              SWEET Issued (24h)
            </h2>
            <div className="flex items-center gap-1.5">
              <PulseDot color="#f59e0b" />
              <span className="text-[11px]" style={{ color: 'var(--sweet-text-muted)' }}>Live</span>
            </div>
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
                <defs>
                  <linearGradient id="sweetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--sweet-text-faint)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'var(--sweet-card)',
                    border: '1px solid var(--sweet-border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--sweet-text)',
                  }}
                  formatter={(v: number) => [`${v} SWEET`, 'Issued']}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#sweetGradient)"
                  dot={false}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* -------- Live Activity Feed -------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
              Live Activity Feed
            </h2>
            <div className="flex items-center gap-1.5">
              <PulseDot />
              <span className="text-[11px]" style={{ color: 'var(--sweet-text-muted)' }}>Real-time</span>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
            <AnimatePresence initial={false}>
              {liveFeed.length === 0 ? (
                <div className="p-6 text-center">
                  <BoltIcon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--sweet-text-faint)' }} />
                  <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
                    Waiting for live events...
                  </p>
                </div>
              ) : (
                liveFeed.map((event, idx) => {
                  const style = getEventStyle(event.type);
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(event.timestamp).getTime();
                    if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
                    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                    return new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  })();

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        borderBottom: idx < liveFeed.length - 1 ? '1px solid var(--sweet-border)' : 'none',
                      }}
                    >
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: style.bg, color: style.color }}>
                        {style.label.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'var(--sweet-text)' }}>
                          {event.message}
                        </p>
                        {event.amount && Number(event.amount) > 0 && (
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: style.color }}>
                            +{Number(event.amount).toLocaleString()} SWEET
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--sweet-text-faint)' }}>
                        {timeAgo}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* -------- Footer -------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center pb-4"
        >
          <p className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
            Sweet Loyalty · TON Blockchain · AI-Powered · DAO Governed
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--sweet-text-faint)', opacity: 0.6 }}>
            Data refreshes every 20s · Real-time via WebSocket
          </p>
        </motion.div>

      </div>
    </div>
  );
}
