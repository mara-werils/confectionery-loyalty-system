import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  GiftIcon,
  UsersThreeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShieldCheckIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  CaretDownIcon,
  LinkIcon,
} from '@phosphor-icons/react';
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
    label: 'Purchase',
    accentColor: 'var(--tx-purchase)',
    accentBg: 'var(--tx-purchase-bg)',
    accentBorder: 'var(--tx-purchase-border)',
    isPositive: true,
  },
  BONUS: {
    icon: GiftIcon,
    label: 'Bonus',
    accentColor: 'var(--tx-bonus)',
    accentBg: 'var(--tx-bonus-bg)',
    accentBorder: 'var(--tx-bonus-border)',
    isPositive: true,
  },
  REFERRAL: {
    icon: UsersThreeIcon,
    label: 'Referral',
    accentColor: 'var(--tx-referral)',
    accentBg: 'var(--tx-referral-bg)',
    accentBorder: 'var(--tx-referral-border)',
    isPositive: true,
  },
  PROMOTION: {
    icon: GiftIcon,
    label: 'Promotion',
    accentColor: 'var(--tx-promotion)',
    accentBg: 'var(--tx-promotion-bg)',
    accentBorder: 'var(--tx-promotion-border)',
    isPositive: true,
  },
  REDEMPTION: {
    icon: GiftIcon,
    label: 'Redemption',
    accentColor: 'var(--tx-redemption)',
    accentBg: 'var(--tx-redemption-bg)',
    accentBorder: 'var(--tx-redemption-border)',
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

  const timeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 2) return 'yesterday';
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="border-b last:border-0"
      style={{ borderColor: 'var(--sweet-border)' }}
    >
      {/* Left accent bar + row */}
      <div
        className={clsx(
          'flex items-center gap-4 py-4 cursor-pointer relative pl-3',
          txHash && 'group'
        )}
        onClick={() => txHash && setDetailOpen(v => !v)}
      >
        {/* Left accent line */}
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-all duration-300"
          style={{
            background: config.accentColor,
            opacity: detailOpen ? 1 : 0.45,
          }}
        />

        {/* Icon */}
        <div
          className="p-2.5 rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ background: config.accentBg, border: `1px solid ${config.accentBorder}` }}
        >
          <Icon className="w-5 h-5" style={{ color: config.accentColor }} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold tracking-tight" style={{ color: 'var(--sweet-text)' }}>
              {config.label}
            </span>
            {description && (
              <span
                className="text-xs truncate font-medium"
                style={{ color: 'var(--sweet-text-muted)' }}
              >
                {description}
              </span>
            )}
            {txHash ? (
              <>
                <span
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                  style={{
                    background: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                  }}
                >
                  <ShieldCheckIcon className="w-2 h-2" style={{ color: '#34d399' }} />
                  <span className="text-[8px] font-bold" style={{ color: '#34d399' }}>on-chain</span>
                </span>
                <a
                  href={`https://testnet.tonviewer.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-amber-500/60 hover:text-amber-400 transition-colors duration-150"
                  title="Verify on TON blockchain"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">TON</span>
                </a>
              </>
            ) : (
              <span
                className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                style={{
                  background: 'var(--sweet-accent-dim)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <span className="text-[8px] font-medium" style={{ color: 'var(--sweet-text-faint)' }}>off-chain</span>
              </span>
            )}
          </div>
          {partnerName && (
            <p
              className="text-xs font-medium truncate mt-0.5"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {partnerName}
            </p>
          )}
          <div
            className="flex items-center gap-2 text-xs mt-1 flex-wrap"
            style={{ color: 'var(--sweet-text-faint)' }}
          >
            <span>{timeAgo(createdAt)}</span>
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--sweet-border-light)' }}
            />
            <span>{formatTime(createdAt)}</span>
            {txHash && (
              <>
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: 'var(--sweet-border-light)' }}
                />
                <a
                  href={`https://testnet.tonviewer.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-0.5 font-mono transition-colors duration-150 hover:underline"
                  style={{ color: 'var(--sweet-text-muted)' }}
                >
                  <ArrowSquareOutIcon className="w-2.5 h-2.5" />
                  {shortenHash(txHash)}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Points + chevron */}
        <div className="text-right flex-shrink-0">
          <div
            className="flex items-center gap-0.5 font-bold tabular-nums"
            style={{ color: config.isPositive ? '#34d399' : '#f87171' }}
          >
            {config.isPositive ? (
              <ArrowUpIcon className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownIcon className="w-3.5 h-3.5" />
            )}
            <span>
              {config.isPositive ? '+' : '-'}
              {Number(pointsEarned).toLocaleString()}
            </span>
          </div>
          {Number(amount) > 0 && (
            <div
              className="text-[11px] font-medium mt-0.5 tabular-nums"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {(Number(amount) / 100).toLocaleString()} KZT
            </div>
          )}
          {txHash && (
            <motion.div
              animate={{ rotate: detailOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-end mt-1"
            >
              <CaretDownIcon
                className="w-3 h-3"
                style={{ color: 'var(--sweet-text-faint)' }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Expandable blockchain proof panel */}
      <AnimatePresence initial={false}>
        {txHash && detailOpen && (
          <motion.div
            key="proof"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-12 pr-1">
              <div
                className="rounded-xl p-3 space-y-2.5"
                style={{
                  background: 'rgba(52, 211, 153, 0.03)',
                  border: '1px solid rgba(52, 211, 153, 0.12)',
                }}
              >
                {/* Confirmed badge */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#34d399' }}>
                    Confirmed on blockchain
                  </span>
                </div>

                {/* TX Hash */}
                <div>
                  <p
                    className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  >
                    Transaction Hash
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className="text-[10px] font-mono break-all leading-relaxed flex-1"
                      style={{ color: 'var(--sweet-text-secondary)' }}
                    >
                      {txHash}
                    </p>
                    <button
                      onClick={copyHash}
                      className="p-1 rounded transition-colors duration-150 shrink-0"
                      style={{
                        color: copied ? '#34d399' : 'var(--sweet-text-faint)',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-border)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      title="Copy hash"
                    >
                      {copied ? (
                        <ShieldCheckIcon className="w-3 h-3" />
                      ) : (
                        <CopyIcon className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Timestamp */}
                <div>
                  <p
                    className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  >
                    Timestamp
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>
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
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg transition-all duration-150 text-[11px] font-medium"
                  style={{
                    background: 'var(--sweet-card)',
                    border: '1px solid var(--sweet-border-light)',
                    color: 'var(--sweet-text-secondary)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--sweet-card-hover)';
                    e.currentTarget.style.color = 'var(--sweet-text)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--sweet-card)';
                    e.currentTarget.style.color = 'var(--sweet-text-secondary)';
                  }}
                >
                  <ArrowSquareOutIcon className="w-3 h-3" />
                  Verify on TON Explorer
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
