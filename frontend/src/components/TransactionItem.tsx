import { motion } from 'framer-motion';
import {
  ShoppingBagIcon,
  GiftIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useState } from 'react';

interface TransactionItemProps {
  id: string;
  amount: string;
  pointsEarned: string;
  type: 'PURCHASE' | 'BONUS' | 'REFERRAL' | 'PROMOTION' | 'REDEMPTION';
  description?: string;
  partnerName?: string;
  createdAt: string;
  index?: number;
  txHash?: string;
}

const typeConfig = {
  PURCHASE: {
    icon: ShoppingBagIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Purchase',
    isPositive: true,
  },
  BONUS: {
    icon: SparklesIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Bonus',
    isPositive: true,
  },
  REFERRAL: {
    icon: UserGroupIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Referral',
    isPositive: true,
  },
  PROMOTION: {
    icon: GiftIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Promotion',
    isPositive: true,
  },
  REDEMPTION: {
    icon: GiftIcon,
    color: 'text-stone-300',
    bg: 'bg-white/5 border border-white/10',
    label: 'Redemption',
    isPositive: false,
  },
};

export default function TransactionItem({
  amount,
  pointsEarned,
  type,
  description,
  partnerName,
  createdAt,
  index = 0,
  txHash,
}: TransactionItemProps) {
  const config = typeConfig[type] || typeConfig.PURCHASE;
  const Icon = config.icon;
  const [detailOpen, setDetailOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortenHash = (hash: string) =>
    hash.length > 12 ? hash.slice(0, 6) + '…' + hash.slice(-4) : hash;

  const copyHash = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/5 last:border-0"
    >
      <div
        className="flex items-center gap-4 py-4 cursor-pointer"
        onClick={() => txHash && setDetailOpen(v => !v)}
      >
        {/* Icon */}
        <div className={clsx('p-3 rounded-xl', config.bg)}>
          <Icon className={clsx('w-5 h-5', config.color)} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white tracking-tight">{config.label}</span>
            {description && (
              <span className="text-xs text-stone-400 truncate font-medium">{description}</span>
            )}
            {txHash ? (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheckIcon className="w-2 h-2 text-emerald-400" />
                <span className="text-[8px] font-bold text-emerald-400">on-chain</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-stone-700/40 border border-stone-700/60">
                <span className="text-[8px] font-medium text-stone-500">off-chain</span>
              </span>
            )}
          </div>
          {partnerName && (
            <p className="text-xs text-stone-400 font-medium truncate mt-0.5">{partnerName}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
            <span>{formatDate(createdAt)}</span>
            <span className="w-1 h-1 bg-stone-700 rounded-full"></span>
            <span>{formatTime(createdAt)}</span>
            {txHash && (
              <>
                <span className="w-1 h-1 bg-stone-700 rounded-full"></span>
                <a
                  href={`https://testnet.tonviewer.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-0.5 font-mono hover:text-stone-300 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
                  {shortenHash(txHash)}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Points */}
        <div className="text-right">
          <div
            className={clsx(
              'flex items-center gap-1 font-bold',
              config.isPositive ? 'text-green-400' : 'text-red-400'
            )}
          >
            {config.isPositive ? (
              <ArrowUpIcon className="w-4 h-4" />
            ) : (
              <ArrowDownIcon className="w-4 h-4" />
            )}
            <span>
              {config.isPositive ? '+' : '-'}
              {Number(pointsEarned).toLocaleString()}
            </span>
          </div>
          {Number(amount) > 0 && (
            <div className="text-[11px] font-medium text-stone-500 mt-1">
              {(Number(amount) / 100).toLocaleString()} KZT
            </div>
          )}
        </div>
      </div>

      {/* Expandable blockchain proof panel */}
      {txHash && detailOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="pb-4 pl-14 overflow-hidden"
        >
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 space-y-2.5">
            {/* Confirmed badge */}
            <div className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400">Confirmed on blockchain</span>
            </div>

            {/* TX Hash */}
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono text-stone-300 break-all leading-relaxed flex-1">{txHash}</p>
                <button
                  onClick={copyHash}
                  className="p-1 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300 transition-colors shrink-0"
                  title="Copy hash"
                >
                  {copied
                    ? <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
                    : <DocumentDuplicateIcon className="w-3 h-3" />
                  }
                </button>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">Timestamp</p>
              <p className="text-[10px] text-stone-400">
                {new Date(createdAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                })}
              </p>
            </div>

            {/* Verify button */}
            <a
              href={`https://testnet.tonviewer.com/transaction/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 hover:border-stone-600 transition-colors text-[11px] font-medium text-stone-300 hover:text-white"
            >
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              Verify on TON Explorer
            </a>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}




