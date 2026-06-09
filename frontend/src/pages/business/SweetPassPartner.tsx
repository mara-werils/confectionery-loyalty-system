import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TicketIcon,
  LockIcon,
  CheckCircleIcon,
  ArrowCounterClockwiseIcon,
  ClockIcon,
  CoinsIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import { io as socketIO, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface PreOrder {
  id: string;
  orderId: string;
  role: 'customer' | 'partner';
  customerWallet: string;
  partnerName: string;
  itemDescription: string;
  amountKzt: number;
  status: 'PENDING_DEPOSIT' | 'FUNDED' | 'RELEASED' | 'REFUNDED';
  deadline: string;
  createdAt: string;
}

interface Metrics {
  preOrdersLocked: number;
  kztPrepaidLocked: number;
  ordersFulfilled: number;
  kztSettledToPartners: number;
  writeOffsPreventedKzt: number;
  ordersRefunded: number;
  totalOrders: number;
}

const STATUS_META: Record<PreOrder['status'], { label: string; color: string; bg: string; Icon: typeof LockIcon }> = {
  PENDING_DEPOSIT: { label: 'Awaiting deposit', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: ClockIcon },
  FUNDED: { label: 'Prepaid — locked', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', Icon: LockIcon },
  RELEASED: { label: 'Paid out', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircleIcon },
  REFUNDED: { label: 'Refunded', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', Icon: ArrowCounterClockwiseIcon },
};

const fmtKzt = (n: number) => `${n.toLocaleString()} ₸`;
const shortAddr = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-5)}` : a);

function timeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'deadline passed';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function SweetPassPartner() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  const loadOrders = async () => {
    try {
      const res = await api.sweetpass.listOrders();
      setOrders(((res as { data: PreOrder[] }).data || []).filter((o) => o.role === 'partner'));
    } catch { /* ignore */ }
  };
  const loadMetrics = async () => {
    try {
      const res = await api.sweetpass.getMetrics();
      setMetrics((res as { data: Metrics }).data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadOrders();
    loadMetrics();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('subscribe:partner', user.id);

    const refresh = () => { loadOrders(); loadMetrics(); };
    socket.on('sweetpass:funded', () => { toast.success('New prepaid order locked'); refresh(); });
    socket.on('sweetpass:released', refresh);
    socket.on('sweetpass:refunded', () => { toast('An order was auto-refunded', { icon: '↩️' }); refresh(); });

    return () => {
      socket.emit('unsubscribe:partner', user.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const handleRelease = async (o: PreOrder) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(o.orderId);
    try {
      await api.sweetpass.release(o.orderId);
      toast.success(`Confirmed — ${fmtKzt(o.amountKzt)} released to you`);
      setOrders((prev) => prev.map((x) => (x.orderId === o.orderId ? { ...x, status: 'RELEASED' } : x)));
      loadMetrics();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Release failed');
      loadOrders();
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  const metricCards = metrics
    ? [
        { label: 'Prepaid & locked', value: fmtKzt(metrics.kztPrepaidLocked), sub: `${metrics.preOrdersLocked} orders`, Icon: LockIcon },
        { label: 'Earned (settled)', value: fmtKzt(metrics.kztSettledToPartners), sub: `${metrics.ordersFulfilled} fulfilled`, Icon: CoinsIcon },
        { label: 'Write-offs prevented', value: fmtKzt(metrics.writeOffsPreventedKzt), sub: 'guaranteed demand', Icon: ShieldCheckIcon },
      ]
    : [];

  const pending = orders.filter((o) => o.status === 'FUNDED');
  const settled = orders.filter((o) => o.status !== 'FUNDED' && o.status !== 'PENDING_DEPOSIT');

  return (
    <div className="pb-32" style={{ color: 'var(--sweet-text)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <TicketIcon className="w-7 h-7" style={{ color: 'var(--sweet-accent)' }} weight="fill" />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--sweet-text)' }}>
            {t('sweetpass.partnerTitle') || 'Sweet Pass — Pre-orders'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('sweetpass.partnerSubtitle') ||
            'Customers prepay into escrow. Confirm pickup to release the funds to you. Unfulfilled orders auto-refund after the deadline.'}
        </p>
      </motion.div>

      {/* Metrics */}
      {metricCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2 mb-5"
        >
          {metricCards.map(({ label, value, sub, Icon }) => (
            <div key={label} className="rounded-2xl p-3" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
              <Icon className="w-4 h-4 mb-1.5" style={{ color: 'var(--sweet-accent)' }} />
              <p className="text-sm font-black leading-tight" style={{ color: 'var(--sweet-text)' }}>{value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>{sub}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Action queue — FUNDED orders awaiting pickup */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--sweet-text-secondary)' }}>
          {t('sweetpass.awaitingPickup') || 'Awaiting pickup'}
        </p>
        {pending.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}>
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--sweet-text-faint)' }}>
          <LockIcon className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm">{t('sweetpass.noPending') || 'No prepaid orders waiting for pickup.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {pending.map((o) => {
              const passed = new Date(o.deadline).getTime() <= Date.now();
              return (
                <motion.div
                  key={o.orderId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <LockIcon className="w-5 h-5" style={{ color: '#3b82f6' }} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--sweet-text)' }}>{o.itemDescription}</p>
                        <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--sweet-text)' }}>{fmtKzt(o.amountKzt)}</span>
                      </div>
                      <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--sweet-text-muted)' }}>{shortAddr(o.customerWallet)}</p>
                      <p className="text-[10px] mt-1" style={{ color: passed ? '#ef4444' : 'var(--sweet-text-faint)' }}>{timeLeft(o.deadline)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRelease(o)}
                    disabled={busyId === o.orderId}
                    className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#22c55e', color: '#fff', opacity: busyId === o.orderId ? 0.6 : 1 }}
                  >
                    {busyId === o.orderId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Releasing on-chain…
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" weight="fill" />
                        {t('sweetpass.confirmPickup') || 'Confirm pickup & release'}
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* History */}
      {settled.length > 0 && (
        <>
          <p className="text-xs font-bold tracking-wider uppercase mt-6 mb-3 px-1" style={{ color: 'var(--sweet-text-secondary)' }}>
            {t('sweetpass.history') || 'History'}
          </p>
          <div className="space-y-2">
            {settled.map((o) => {
              const meta = STATUS_META[o.status];
              return (
                <div
                  key={o.orderId}
                  className="flex items-center gap-3 rounded-2xl p-3.5"
                  style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <meta.Icon className="w-4 h-4" style={{ color: meta.color }} weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--sweet-text)' }}>{o.itemDescription}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--sweet-text)' }}>{fmtKzt(o.amountKzt)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
