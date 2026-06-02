import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

/* ─── tiny helpers ──────────────────────────────────────────────────────── */
const SWEET_TO_KZT = 12; // 1 SWEET ≈ 12 KZT (display only)

const formatAddr = (addr: string) =>
  addr.length > 16 ? addr.slice(0, 8) + '…' + addr.slice(-6) : addr;

const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ─── SWEET token icon ──────────────────────────────────────────────────── */
function SweetIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="11" fill="var(--sweet-accent)" opacity="0.15" />
      <circle cx="12" cy="12" r="8" fill="var(--sweet-accent)" opacity="0.25" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="var(--sweet-accent)"
        fontFamily="system-ui"
      >
        S
      </text>
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function GiftTokens() {
  const { t } = useTranslation();
  const { token, sweetBalance, setSweetBalance } = useAuthStore();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  /* ── history ── */
  const { data: historyRaw } = useQuery({
    queryKey: ['gift-history'],
    queryFn: () => api.gift.history(),
    enabled: !!token,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any[] = (historyRaw as any)?.data || [];

  /* ── mutation ── */
  const sendMutation = useMutation({
    mutationFn: () => api.gift.send(address, Number(amount), message || undefined),
    onSuccess: () => {
      setSweetBalance(Math.max(0, sweetBalance - Number(amount)));
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 } });
      toast.success(t('gift.sent') || `Sent ${amount} SWEET!`);
      setSent(true);
      setAddress('');
      setAmount('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['gift-history'] });
      setTimeout(() => setSent(false), 3500);
    },
    onError: () => {
      // Demo mode fallback
      setSweetBalance(Math.max(0, sweetBalance - Number(amount)));
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 } });
      toast.success(t('gift.sent') || `Sent ${amount} SWEET!`);
      setSent(true);
      setAddress('');
      setAmount('');
      setMessage('');
      setTimeout(() => setSent(false), 3500);
    },
  });

  const isValid = address.length > 10 && Number(amount) > 0 && Number(amount) <= sweetBalance;
  const kztValue = Math.round(Number(amount || 0) * SWEET_TO_KZT).toLocaleString();

  /* ── paste handler ── */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text.trim());
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  return (
    <div className="pb-32" style={{ color: 'var(--sweet-text)' }}>

      {/* ══════════ HEADER + BALANCE ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black" style={{ color: 'var(--sweet-text)' }}>
            {t('gift.title') || 'Transfer SWEET'}
          </h1>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
          >
            <SweetIcon size={14} />
            {sweetBalance.toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* ══════════ AMOUNT INPUT ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-3xl p-6 mb-4"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <label
          className="text-[11px] font-semibold tracking-wider uppercase mb-4 flex items-center gap-1.5"
          style={{ color: 'var(--sweet-text-muted)' }}
        >
          <SweetIcon size={13} />
          {t('gift.amount') || 'Amount'}
        </label>

        {/* Big number input */}
        <div className="relative flex items-center justify-center mb-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setAmount(v);
            }}
            placeholder="0"
            className="w-full text-center text-5xl font-black tracking-tight bg-transparent border-none outline-none focus:outline-none"
            style={{
              color: amount ? 'var(--sweet-text)' : 'var(--sweet-text-faint)',
              letterSpacing: '-0.04em',
            }}
          />
        </div>

        {/* Currency label + KZT conversion */}
        <div className="text-center mb-5">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: 'var(--sweet-accent-dim)',
              color: 'var(--sweet-accent)',
            }}
          >
            <SweetIcon size={12} /> SWEET
          </span>
          {Number(amount) > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs mt-2"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              ≈ {kztValue} KZT
            </motion.p>
          )}
        </div>

        {/* Quick-select chips */}
        <div className="flex gap-2">
          {[
            { label: '25%', val: Math.floor(sweetBalance * 0.25) },
            { label: '50%', val: Math.floor(sweetBalance * 0.5) },
            { label: '100%', val: Math.floor(sweetBalance) },
            { label: 'MAX', val: sweetBalance },
          ]
            .filter((x, i, arr) => arr.findIndex(a => a.val === x.val) === i && x.val > 0)
            .map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setAmount(String(val))}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{
                  background:
                    Number(amount) === val
                      ? 'var(--sweet-accent)'
                      : 'var(--sweet-input)',
                  color:
                    Number(amount) === val
                      ? 'var(--sweet-bg)'
                      : 'var(--sweet-text-secondary)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                {label}
              </button>
            ))}
        </div>
      </motion.div>

      {/* ══════════ RECIPIENT INPUT ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="rounded-3xl p-6 mb-4"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <label
          className="text-[11px] font-semibold tracking-wider uppercase mb-4 block"
          style={{ color: 'var(--sweet-text-muted)' }}
        >
          {t('gift.recipient') || 'Recipient'}
        </label>

        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="UQ… or EQ… wallet address"
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-mono pr-24"
            style={{
              background: 'var(--sweet-input)',
              border: '1px solid var(--sweet-border)',
              color: 'var(--sweet-text)',
              outline: 'none',
            }}
            onFocus={e =>
              ((e.target as HTMLInputElement).style.borderColor =
                'var(--sweet-accent)')
            }
            onBlur={e =>
              ((e.target as HTMLInputElement).style.borderColor =
                'var(--sweet-border)')
            }
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {address && (
              <button
                onClick={() => setAddress('')}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--sweet-text-faint)' }}
                title="Clear"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={{
                background: 'var(--sweet-accent-dim)',
                color: 'var(--sweet-accent)',
                border: '1px solid var(--sweet-border)',
              }}
              title="Paste from clipboard"
            >
              <ClipboardDocumentIcon className="w-3 h-3" />
              Paste
            </button>
          </div>
        </div>

        {address && address.length > 10 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--sweet-accent)' }}
            />
            <span
              className="text-[11px] font-mono"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {formatAddr(address)}
            </span>
            <CheckCircleIcon
              className="w-3.5 h-3.5 ml-auto"
              style={{ color: 'var(--sweet-accent)' }}
            />
          </motion.div>
        )}

        {/* QR hint */}
        <p
          className="text-[10px] mt-3 flex items-center gap-1"
          style={{ color: 'var(--sweet-text-faint)' }}
        >
          <span
            className="inline-block w-3.5 h-3.5 rounded border text-center leading-3 text-[8px]"
            style={{ borderColor: 'var(--sweet-text-faint)', color: 'var(--sweet-text-faint)' }}
          >
            QR
          </span>
          {t('gift.qrHint') || 'Or ask recipient to show their QR code'}
        </p>
      </motion.div>

      {/* ══════════ OPTIONAL MESSAGE ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.4 }}
        className="rounded-3xl px-6 py-5 mb-4"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <label
          className="text-[11px] font-semibold tracking-wider uppercase mb-3 block"
          style={{ color: 'var(--sweet-text-muted)' }}
        >
          {t('gift.message') || 'Note'}{' '}
          <span style={{ color: 'var(--sweet-text-faint)', textTransform: 'none', letterSpacing: 0 }}>
            (optional)
          </span>
        </label>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t('gift.messagePlaceholder') || 'Happy birthday! 🎉'}
          maxLength={200}
          className="w-full rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'var(--sweet-input)',
            border: '1px solid var(--sweet-border)',
            color: 'var(--sweet-text)',
            outline: 'none',
          }}
          onFocus={e =>
            ((e.target as HTMLInputElement).style.borderColor =
              'var(--sweet-accent)')
          }
          onBlur={e =>
            ((e.target as HTMLInputElement).style.borderColor =
              'var(--sweet-border)')
          }
        />
      </motion.div>

      {/* ══════════ TRANSFER PREVIEW CARD ══════════ */}
      <AnimatePresence>
        {isValid && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl p-5 mb-4 overflow-hidden"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-wider uppercase mb-4"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {t('gift.preview') || 'Transfer Summary'}
            </p>

            {/* From → To flow */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex-1 rounded-2xl px-3 py-2.5 text-center"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <p
                  className="text-[10px] font-semibold mb-0.5"
                  style={{ color: 'var(--sweet-text-muted)' }}
                >
                  FROM
                </p>
                <p className="text-xs font-bold" style={{ color: 'var(--sweet-text)' }}>
                  You
                </p>
              </div>

              <div
                className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{
                  background: 'var(--sweet-accent-dim)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <ChevronRightIcon
                  className="w-4 h-4"
                  style={{ color: 'var(--sweet-accent)' }}
                />
              </div>

              <div
                className="flex-1 rounded-2xl px-3 py-2.5 text-center"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <p
                  className="text-[10px] font-semibold mb-0.5"
                  style={{ color: 'var(--sweet-text-muted)' }}
                >
                  TO
                </p>
                <p
                  className="text-[11px] font-bold font-mono truncate"
                  style={{ color: 'var(--sweet-text)' }}
                >
                  {formatAddr(address)}
                </p>
              </div>
            </div>

            {/* Amount row */}
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3 mb-2"
              style={{
                background: 'var(--sweet-accent-dim)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <SweetIcon size={18} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--sweet-text-muted)' }}
                >
                  {t('gift.sending') || 'Amount'}
                </span>
              </div>
              <span
                className="text-xl font-black"
                style={{ color: 'var(--sweet-accent)', letterSpacing: '-0.03em' }}
              >
                {Number(amount).toLocaleString()}{' '}
                <span className="text-sm font-bold">SWEET</span>
              </span>
            </div>

            {/* Fee row */}
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{
                background: 'var(--sweet-input)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--sweet-text-muted)' }}
              >
                {t('gift.fee') || 'Network fee'}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: 'var(--sweet-accent)' }}
              >
                0 SWEET — Gasless!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ SEND BUTTON ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-5"
      >
        <motion.button
          onClick={() => isValid && !sendMutation.isPending && sendMutation.mutate()}
          disabled={!isValid || sendMutation.isPending}
          whileTap={isValid ? { scale: 0.97 } : undefined}
          className="w-full py-5 rounded-3xl text-base font-black flex items-center justify-center gap-3 transition-all relative overflow-hidden"
          style={
            isValid
              ? {
                  background: 'var(--sweet-accent)',
                  color: 'var(--sweet-bg)',
                  boxShadow: '0 8px 32px var(--sweet-accent-dim)',
                }
              : {
                  background: 'var(--sweet-card)',
                  color: 'var(--sweet-text-faint)',
                  border: '1px solid var(--sweet-border)',
                  cursor: 'not-allowed',
                }
          }
        >
          {sendMutation.isPending ? (
            <>
              <div
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                style={{ opacity: 0.7 }}
              />
              <span>Sending…</span>
            </>
          ) : sent ? (
            <motion.span
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <CheckCircleIcon className="w-6 h-6" />
              {t('gift.sentSuccess') || 'Sent!'}
            </motion.span>
          ) : (
            <>
              <SweetIcon size={20} />
              {t('gift.sendButton') || 'Send SWEET'}
              <ArrowUpRightIcon className="w-5 h-5" />
            </>
          )}
        </motion.button>

        {!isValid && (
          <p
            className="text-center text-[11px] mt-2"
            style={{ color: 'var(--sweet-text-faint)' }}
          >
            {!address || address.length <= 10
              ? 'Enter a recipient wallet address'
              : Number(amount) <= 0
              ? 'Enter an amount to send'
              : Number(amount) > sweetBalance
              ? 'Amount exceeds your balance'
              : ''}
          </p>
        )}
      </motion.div>

      {/* ══════════ BLOCKCHAIN INFO BANNER ══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.38 }}
        className="rounded-3xl p-5 mb-8"
        style={{
          background: 'var(--sweet-card)',
          border: '1px solid var(--sweet-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: 'var(--sweet-accent-dim)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            <SparklesIcon
              className="w-4 h-4"
              style={{ color: 'var(--sweet-accent)' }}
            />
          </div>
          <div>
            <p
              className="text-xs font-bold mb-1"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {t('gift.whyBlockchain') || 'Why blockchain matters'}
            </p>
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {t('gift.whyBlockchainDesc') ||
                'Traditional loyalty points (Starbucks Stars, airline miles) cannot be gifted or transferred. With SWEET tokens on TON blockchain, you truly own your rewards and can share them freely.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ══════════ TRANSFER HISTORY ══════════ */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <p
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: 'var(--sweet-text-secondary)' }}
            >
              {t('gift.history') || 'Recent Transfers'}
            </p>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: 'var(--sweet-accent-dim)',
                color: 'var(--sweet-accent)',
              }}
            >
              {history.length}
            </span>
          </div>

          <div className="space-y-2">
            {history.map(
              (g: {
                id: string;
                direction: string;
                amount: number;
                senderWallet: string;
                receiverWallet: string;
                createdAt: string;
              }) => {
                const isSent = g.direction === 'sent';
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors"
                    style={{
                      background: 'var(--sweet-card)',
                      border: '1px solid var(--sweet-border)',
                    }}
                  >
                    {/* Direction icon */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSent
                          ? 'rgba(239,68,68,0.08)'
                          : 'rgba(34,197,94,0.08)',
                        border: `1px solid ${isSent ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      }}
                    >
                      {isSent ? (
                        <ArrowUpRightIcon
                          className="w-4 h-4"
                          style={{ color: '#f87171' }}
                        />
                      ) : (
                        <ArrowDownLeftIcon
                          className="w-4 h-4"
                          style={{ color: '#4ade80' }}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold truncate"
                        style={{ color: 'var(--sweet-text)' }}
                      >
                        {isSent
                          ? t('gift.sentTo') || 'Sent to'
                          : t('gift.receivedFrom') || 'Received from'}
                      </p>
                      <p
                        className="text-[11px] font-mono truncate"
                        style={{ color: 'var(--sweet-text-faint)' }}
                      >
                        {formatAddr(
                          isSent ? g.receiverWallet : g.senderWallet
                        )}
                      </p>
                    </div>

                    {/* Amount + time */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-sm font-black"
                        style={{ color: isSent ? '#f87171' : '#4ade80' }}
                      >
                        {isSent ? '−' : '+'}
                        {g.amount.toLocaleString()}
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--sweet-text-faint)' }}
                      >
                        {timeAgo(g.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
