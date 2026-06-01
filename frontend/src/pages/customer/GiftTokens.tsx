import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  GiftIcon,
  PaperAirplaneIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export default function GiftTokens() {
  const { t } = useTranslation();
  const { token, sweetBalance, setSweetBalance } = useAuthStore();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const { data: historyRaw } = useQuery({
    queryKey: ['gift-history'],
    queryFn: () => api.gift.history(),
    enabled: !!token,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any[] = (historyRaw as any)?.data || [];

  const sendMutation = useMutation({
    mutationFn: () => api.gift.send(address, Number(amount), message || undefined),
    onSuccess: () => {
      setSweetBalance(Math.max(0, sweetBalance - Number(amount)));
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      toast.success(t('gift.sent') || `Sent ${amount} SWEET!`);
      setSent(true);
      setAddress('');
      setAmount('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['gift-history'] });
      setTimeout(() => setSent(false), 3000);
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || 'Transfer failed';
      toast.error(msg);
    },
  });

  const isValid = address.length > 10 && Number(amount) > 0 && Number(amount) <= sweetBalance;

  const formatAddr = (addr: string) =>
    addr.length > 16 ? addr.slice(0, 8) + '...' + addr.slice(-6) : addr;

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="pb-28 text-white">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-pink-400/15 border border-pink-400/25 flex items-center justify-center">
            <GiftIcon className="w-4 h-4 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('gift.title') || 'Gift SWEET'}</h1>
        </div>
        <p className="text-xs text-stone-500">
          {t('gift.subtitle') || 'Send SWEET tokens to a friend. Only possible with blockchain!'}
        </p>
      </motion.div>

      {/* Balance */}
      <div className="flex items-center justify-between mb-5 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <span className="text-sm text-stone-400">{t('gift.yourBalance') || 'Your Balance'}</span>
        <span className="text-lg font-black text-amber-400">{sweetBalance.toLocaleString()} SWEET</span>
      </div>

      {/* Send Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-stone-900 border border-stone-800 rounded-2xl p-5 mb-5 space-y-4"
      >
        {/* Recipient */}
        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
            {t('gift.recipient') || 'Recipient Wallet'}
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="UQ... or EQ..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:border-amber-400/50 focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
            {t('gift.amount') || 'Amount'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              max={sweetBalance}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:border-amber-400/50 focus:outline-none transition-colors"
            />
            <button
              onClick={() => setAmount(String(sweetBalance))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
            {t('gift.message') || 'Message (optional)'}
          </label>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('gift.messagePlaceholder') || 'Happy birthday!'}
            maxLength={200}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:border-amber-400/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Preview */}
        {isValid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">{t('gift.sending') || 'Sending'}</span>
              <span className="text-sm font-bold text-amber-400">{Number(amount).toLocaleString()} SWEET</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-stone-500">{t('gift.to') || 'To'}</span>
              <span className="text-xs font-mono text-stone-300">{formatAddr(address)}</span>
            </div>
          </motion.div>
        )}

        {/* Send Button */}
        <button
          onClick={() => isValid && sendMutation.mutate()}
          disabled={!isValid || sendMutation.isPending}
          className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            isValid
              ? 'bg-pink-500 text-white hover:bg-pink-400 shadow-lg shadow-pink-500/20'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          {sendMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : sent ? (
            <><CheckCircleIcon className="w-5 h-5" /> {t('gift.sentSuccess') || 'Sent!'}</>
          ) : (
            <><PaperAirplaneIcon className="w-4 h-4" /> {t('gift.sendButton') || 'Send Gift'}</>
          )}
        </button>
      </motion.div>

      {/* Why blockchain banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-amber-400 mb-1">{t('gift.whyBlockchain') || 'Why blockchain matters'}</p>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          {t('gift.whyBlockchainDesc') || 'Traditional loyalty points (Starbucks Stars, airline miles) cannot be gifted or transferred. With SWEET tokens on TON blockchain, you truly own your rewards and can share them freely.'}
        </p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-3">{t('gift.history') || 'Gift History'}</p>
          <div className="space-y-2">
            {history.map((g: { id: string; direction: string; amount: number; senderWallet: string; receiverWallet: string; createdAt: string }) => (
              <div key={g.id} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    g.direction === 'sent' ? 'bg-pink-500/10' : 'bg-green-500/10'
                  }`}>
                    {g.direction === 'sent'
                      ? <ArrowUpRightIcon className="w-4 h-4 text-pink-400" />
                      : <ArrowDownLeftIcon className="w-4 h-4 text-green-400" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {g.direction === 'sent' ? t('gift.sentTo') || 'Sent to' : t('gift.receivedFrom') || 'Received from'}
                    </p>
                    <p className="text-[10px] font-mono text-stone-600">
                      {formatAddr(g.direction === 'sent' ? g.receiverWallet : g.senderWallet)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${g.direction === 'sent' ? 'text-pink-400' : 'text-green-400'}`}>
                    {g.direction === 'sent' ? '-' : '+'}{g.amount}
                  </p>
                  <p className="text-[10px] text-stone-600">{timeAgo(g.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
