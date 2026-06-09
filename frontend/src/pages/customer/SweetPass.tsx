import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import {
  TicketIcon,
  LockIcon,
  CheckCircleIcon,
  ArrowCounterClockwiseIcon,
  ClockIcon,
  StorefrontIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import { io as socketIO, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { buildDepositTransaction, DepositInstructions } from '../../services/sweetpass';

interface Partner {
  id: string;
  companyName: string;
  walletAddress: string;
}

interface PreOrder {
  id: string;
  orderId: string;
  role: 'customer' | 'partner';
  partnerName: string;
  itemDescription: string;
  amountKzt: number;
  status: 'PENDING_DEPOSIT' | 'FUNDED' | 'RELEASED' | 'REFUNDED';
  deadline: string;
  depositTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
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
  FUNDED: { label: 'Locked in escrow', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', Icon: LockIcon },
  RELEASED: { label: 'Fulfilled', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircleIcon },
  REFUNDED: { label: 'Refunded', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', Icon: ArrowCounterClockwiseIcon },
};

const fmtKzt = (n: number) => `${n.toLocaleString()} ₸`;

function timeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'deadline passed';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function SweetPass() {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { walletAddress } = useAuthStore();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [partnerId, setPartnerId] = useState('');
  const [item, setItem] = useState('');
  const [amountKzt, setAmountKzt] = useState('');
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const loadOrders = async () => {
    try {
      const res = await api.sweetpass.listOrders();
      setOrders(((res as { data: PreOrder[] }).data || []).filter((o) => o.role === 'customer'));
    } catch { /* ignore */ }
  };
  const loadMetrics = async () => {
    try {
      const res = await api.sweetpass.getMetrics();
      setMetrics((res as { data: Metrics }).data);
    } catch { /* ignore */ }
  };

  // Initial data: partners (to order from), my orders, live metrics
  useEffect(() => {
    api.partners
      .list({ page: 1, limit: 100 })
      .then((res) => {
        const list = ((res as { data: Partner[] }).data || []).filter(
          (p) => p.walletAddress && p.walletAddress !== walletAddress
        );
        setPartners(list);
        if (list[0]) setPartnerId(list[0].id);
      })
      .catch(() => { /* ignore */ });
    loadOrders();
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Real-time order lifecycle updates
  useEffect(() => {
    if (!walletAddress) return;
    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('subscribe:wallet', walletAddress);

    const refresh = () => { loadOrders(); loadMetrics(); };
    socket.on('sweetpass:funded', () => { toast.success('Deposit locked in escrow'); refresh(); });
    socket.on('sweetpass:released', () => { toast.success('Order fulfilled — paid to confectionery'); refresh(); });
    socket.on('sweetpass:refunded', () => { toast('Order refunded to you', { icon: '↩️' }); refresh(); });

    return () => {
      socket.emit('unsubscribe:wallet', walletAddress);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const kztNum = Number(amountKzt) || 0;
  const canSubmit = !!partnerId && item.trim().length > 0 && kztNum > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    if (!wallet) { tonConnectUI.openModal(); return; }
    setSubmitting(true);
    try {
      // 1. Reserve the order + get on-chain deposit instructions
      const res = await api.sweetpass.createOrder({
        partnerId,
        itemDescription: item.trim(),
        amountKzt: kztNum,
        deadlineHours,
      });
      const data = (res as { data: DepositInstructions & { orderId: string } }).data;
      if (!data.escrowAddress || !data.jettonMaster) {
        throw new Error('Escrow is not configured on the server');
      }

      // 2. Build + sign the SWEET jetton deposit into the escrow
      const tx = await buildDepositTransaction(wallet.account.address, data);
      await tonConnectUI.sendTransaction(tx);
      toast.success('Deposit sent — confirming on-chain…');

      // 3. Reset form; poll until the escrow reports FUNDED
      setItem('');
      setAmountKzt('');
      loadOrders();
      pollConfirm(data.orderId);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      if (!/reject|cancel|decline/i.test(msg)) toast.error(msg || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Poll confirm-deposit until the chain shows FUNDED (escrow is the source of truth)
  const pollConfirm = (orderId: string) => {
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await api.sweetpass.confirmDeposit(orderId);
        const status = (res as { data?: { status?: string } }).data?.status;
        if (status === 'FUNDED') { loadOrders(); loadMetrics(); return; }
      } catch { /* keep polling */ }
      if (attempts < 20) setTimeout(tick, 3000);
    };
    setTimeout(tick, 3000);
  };

  const metricCards = metrics
    ? [
        { label: 'Locked in escrow', value: fmtKzt(metrics.kztPrepaidLocked), sub: `${metrics.preOrdersLocked} pre-orders`, Icon: LockIcon },
        { label: 'Guaranteed revenue', value: fmtKzt(metrics.kztSettledToPartners), sub: `${metrics.ordersFulfilled} fulfilled`, Icon: CheckCircleIcon },
        { label: 'Write-offs prevented', value: fmtKzt(metrics.writeOffsPreventedKzt), sub: 'committed demand', Icon: ShieldCheckIcon },
      ]
    : [];

  return (
    <div className="pb-32" style={{ color: 'var(--sweet-text)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <TicketIcon className="w-7 h-7" style={{ color: 'var(--sweet-accent)' }} weight="fill" />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--sweet-text)' }}>
            {t('sweetpass.title') || 'Sweet Pass'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('sweetpass.subtitle') ||
            'Prepay your order. A smart contract holds your SWEET in escrow and auto-refunds if it is not ready by the deadline.'}
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
            <div
              key={label}
              className="rounded-2xl p-3"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <Icon className="w-4 h-4 mb-1.5" style={{ color: 'var(--sweet-accent)' }} />
              <p className="text-sm font-black leading-tight" style={{ color: 'var(--sweet-text)' }}>{value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>{sub}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Create pre-order */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl p-5 mb-5"
        style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
      >
        <p className="text-[11px] font-semibold tracking-wider uppercase mb-4" style={{ color: 'var(--sweet-accent)' }}>
          {t('sweetpass.newOrder') || 'New pre-order'}
        </p>

        {/* Confectionery */}
        <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--sweet-text-muted)' }}>
          <StorefrontIcon className="w-3.5 h-3.5" /> {t('sweetpass.confectionery') || 'Confectionery'}
        </label>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          className="w-full rounded-2xl px-4 py-3 text-sm mb-4 appearance-none"
          style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)', outline: 'none' }}
        >
          {partners.length === 0 && <option value="">No confectioneries available</option>}
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.companyName}</option>
          ))}
        </select>

        {/* Item */}
        <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('sweetpass.item') || 'What are you ordering?'}
        </label>
        <input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          maxLength={200}
          placeholder='e.g. "Napoleon cake, pick up tomorrow"'
          className="w-full rounded-2xl px-4 py-3 text-sm mb-4"
          style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)', outline: 'none' }}
        />

        {/* Amount */}
        <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('sweetpass.amount') || 'Deposit amount (KZT)'}
        </label>
        <div className="relative mb-4">
          <input
            type="text"
            inputMode="numeric"
            value={amountKzt}
            onChange={(e) => setAmountKzt(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold"
            style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)', outline: 'none' }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--sweet-text-faint)' }}>
            ₸ → {kztNum.toLocaleString()} SWEET
          </span>
        </div>

        {/* Deadline */}
        <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('sweetpass.deadline') || 'Pickup deadline'}
        </label>
        <div className="flex gap-2 mb-5">
          {[
            { label: '6h', val: 6 },
            { label: '12h', val: 12 },
            { label: '24h', val: 24 },
            { label: '3d', val: 72 },
          ].map(({ label, val }) => (
            <button
              key={val}
              onClick={() => setDeadlineHours(val)}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
              style={{
                background: deadlineHours === val ? 'var(--sweet-accent)' : 'var(--sweet-input)',
                color: deadlineHours === val ? 'var(--sweet-bg)' : 'var(--sweet-text-secondary)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.button
          onClick={handleCreate}
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          className="w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all"
          style={
            canSubmit
              ? { background: 'var(--sweet-accent)', color: 'var(--sweet-bg)', boxShadow: '0 8px 32px var(--sweet-accent-dim)' }
              : { background: 'var(--sweet-card)', color: 'var(--sweet-text-faint)', border: '1px solid var(--sweet-border)', cursor: 'not-allowed' }
          }
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ opacity: 0.7 }} />
              Signing deposit…
            </>
          ) : !wallet ? (
            <>{t('sweetpass.connect') || 'Connect wallet to prepay'}</>
          ) : (
            <>
              <LockIcon className="w-4 h-4" weight="fill" />
              {t('sweetpass.lockDeposit') || 'Lock deposit in escrow'}
            </>
          )}
        </motion.button>
      </motion.div>

      {/* My orders */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--sweet-text-secondary)' }}>
          {t('sweetpass.myOrders') || 'My pre-orders'}
        </p>
        {orders.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}>
            {orders.length}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--sweet-text-faint)' }}>
          <TicketIcon className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm">{t('sweetpass.empty') || 'No pre-orders yet. Lock your first deposit above.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {orders.map((o) => {
              const meta = STATUS_META[o.status];
              return (
                <motion.div
                  key={o.orderId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                      <meta.Icon className="w-5 h-5" style={{ color: meta.color }} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--sweet-text)' }}>{o.itemDescription}</p>
                        <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--sweet-text)' }}>{fmtKzt(o.amountKzt)}</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{o.partnerName}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {o.status === 'FUNDED' && (
                          <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>{timeLeft(o.deadline)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Why it matters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 mt-5"
        style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--sweet-accent)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sweet-text-muted)' }}>
            {t('sweetpass.why') ||
              'Your deposit is held by an on-chain escrow contract — not the shop. The confectionery only gets paid when you pick up your order. If they miss the deadline, the contract refunds you automatically, no questions asked.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
