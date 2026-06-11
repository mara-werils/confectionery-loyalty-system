import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBagIcon,
  StorefrontIcon,
  CoinsIcon,
  GiftIcon,
  BankIcon,
  ArrowSquareOutIcon,
  SealCheckIcon,
  CrownIcon,
} from '@phosphor-icons/react';

// ─── On-chain contracts (TON testnet) ────────────────────────────────────────

const CONTRACTS = [
  { key: 'token', name: 'SWEET Jetton (TEP-74)', address: 'kQBNOiJ4aToE-Ea12DpY5nBmu1bKT0axt81JmS9BFPh8nCio' },
  { key: 'registry', name: 'Partner Registry', address: 'kQCtFd8sLhJDFQiSd8Zgct6Z8ODtMy5A6-CYaaBuIClffsIg' },
  { key: 'redemption', name: 'Redemption Manager', address: 'kQBChxrJHHMwqy0gL9DqPmcsM_K1FS7WGIz_pt00AJp_fVjw' },
  { key: 'revenue', name: 'Revenue Distribution', address: 'kQCSaOfJrZncDkbYD_bzSxEVksQzuC8JoAUDWXPffwhYu39w' },
];

const explorerUrl = (addr: string) => `https://testnet.tonviewer.com/${addr}`;
const shortAddr = (addr: string) => `${addr.slice(0, 8)}…${addr.slice(-6)}`;

// ─── Tiers ───────────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'bronze', color: '#c2783c', multiplier: '×1.0', cashback: '10%', commission: '3%', threshold: '0' },
  { key: 'silver', color: '#8a93a3', multiplier: '×1.5', cashback: '12%', commission: '5%', threshold: '5 000' },
  { key: 'gold', color: '#d99e16', multiplier: '×2.0', cashback: '15%', commission: '7%', threshold: '20 000' },
];

// ─── Animated connector: a pulse travelling down a line ─────────────────────

function FlowConnector({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex justify-center">
      <div
        className="relative w-px h-9 overflow-hidden"
        style={{ background: 'var(--sweet-border)' }}
      >
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-[3px] h-3 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--sweet-accent), transparent)',
            boxShadow: '0 0 8px var(--sweet-accent)',
          }}
          initial={{ y: -14 }}
          animate={{ y: 40 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeIn', delay, repeatDelay: 0.4 }}
        />
      </div>
    </div>
  );
}

// ─── Flow step card ──────────────────────────────────────────────────────────

function FlowStep({
  icon: Icon, color, step, title, desc, badge, index,
}: {
  icon: typeof CoinsIcon; color: string; step: string; title: string; desc: string;
  badge?: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: 0.06 * index }}
      className="rounded-2xl p-4 flex items-start gap-3.5"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a`, color }}
      >
        <Icon weight="duotone" className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color }}>
          {step}
        </p>
        <p className="text-[14px] font-bold leading-snug" style={{ color: 'var(--sweet-text)' }}>
          {title}
        </p>
        <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
          {desc}
        </p>
        {badge && (
          <span
            className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
          >
            <SealCheckIcon weight="fill" className="w-3 h-3" />
            {badge}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Tokenomics() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: ShoppingBagIcon,
      color: '#60a5fa',
      title: t('tokenomics.s1Title', 'Purchase at a confectionery'),
      desc: t('tokenomics.s1Desc', 'You pay in KZT as usual — at any partner of the network.'),
    },
    {
      icon: StorefrontIcon,
      color: '#f59e0b',
      title: t('tokenomics.s2Title', 'Partner POS awards cashback'),
      desc: t('tokenomics.s2Desc', 'The cashier scans your wallet QR. 10–15% of the bill converts to SWEET depending on your tier.'),
    },
    {
      icon: CoinsIcon,
      color: '#34d399',
      title: t('tokenomics.s3Title', 'SWEET lands in your TON wallet'),
      desc: t('tokenomics.s3Desc', '1 SWEET = 1 KZT. The jetton transfer is recorded on the TON blockchain — verifiable by anyone.'),
      badge: t('tokenomics.onChain', 'Verifiable on-chain'),
    },
    {
      icon: GiftIcon,
      color: '#f87171',
      title: t('tokenomics.s4Title', 'Spend it your way'),
      desc: t('tokenomics.s4Desc', 'Rewards and coupons, gifts to friends, prepaid pre-orders held by an escrow smart contract.'),
    },
    {
      icon: BankIcon,
      color: '#a78bfa',
      title: t('tokenomics.s5Title', 'Platform earns transparently'),
      desc: t('tokenomics.s5Desc', 'A 3–7% commission accrues to the Revenue Distribution contract — payouts are enforced by code, not promises.'),
      badge: t('tokenomics.onChain', 'Verifiable on-chain'),
    },
  ];

  return (
    <div className="pb-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
          >
            <CoinsIcon weight="duotone" className="w-5 h-5" />
          </motion.div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sweet-text)' }}>
            {t('tokenomics.title', 'How SWEET works')}
          </h1>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('tokenomics.subtitle', 'One token connects customers, confectioneries and the platform — every step enforced by smart contracts on TON.')}
        </p>
      </motion.div>

      {/* Token flow */}
      <div className="mb-8">
        {steps.map((s, i) => (
          <div key={i}>
            <FlowStep
              icon={s.icon}
              color={s.color}
              step={`${t('tokenomics.step', 'Step')} ${i + 1}`}
              title={s.title}
              desc={s.desc}
              badge={s.badge}
              index={i}
            />
            {i < steps.length - 1 && <FlowConnector delay={i * 0.3} />}
          </div>
        ))}
      </div>

      {/* Tiers */}
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-[15px] font-black mb-3 flex items-center gap-1.5"
        style={{ color: 'var(--sweet-text)' }}
      >
        <CrownIcon weight="duotone" className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
        {t('tokenomics.tiersTitle', 'Loyalty tiers')}
      </motion.h2>
      <div className="grid grid-cols-3 gap-2 mb-8">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.key}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
            className="rounded-2xl p-3 text-center"
            style={{
              background: 'var(--sweet-card)',
              border: `1px solid ${tier.color}40`,
              boxShadow: `0 4px 18px ${tier.color}12`,
            }}
          >
            <p className="text-[11px] font-black tracking-wide uppercase mb-1.5" style={{ color: tier.color }}>
              {t(`tokenomics.${tier.key}`, tier.key)}
            </p>
            <p className="text-xl font-black leading-none mb-0.5" style={{ color: 'var(--sweet-text)' }}>
              {tier.cashback}
            </p>
            <p className="text-[9px] mb-2" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('tokenomics.cashback', 'cashback')}
            </p>
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--sweet-text-secondary)' }}>
              <p>{t('tokenomics.multiplier', 'Points')} {tier.multiplier}</p>
              <p>{t('tokenomics.from', 'from')} {tier.threshold} SWEET</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contracts */}
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-[15px] font-black mb-1 flex items-center gap-1.5"
        style={{ color: 'var(--sweet-text)' }}
      >
        <span className="relative flex w-2.5 h-2.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: '#34d399' }}
          />
          <span className="relative inline-flex rounded-full w-2.5 h-2.5" style={{ background: '#34d399' }} />
        </span>
        {t('tokenomics.contractsTitle', 'Live on TON testnet')}
      </motion.h2>
      <p className="text-[12px] mb-3" style={{ color: 'var(--sweet-text-muted)' }}>
        {t('tokenomics.contractsDesc', 'Four smart contracts run the economy. Tap any to inspect it in the public explorer.')}
      </p>
      <div className="space-y-2 mb-6">
        {CONTRACTS.map((c, i) => (
          <motion.a
            key={c.key}
            href={explorerUrl(c.address)}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 * i, duration: 0.3 }}
            className="flex items-center justify-between rounded-xl px-3.5 py-3 transition-transform active:scale-[0.99]"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-bold" style={{ color: 'var(--sweet-text)' }}>{c.name}</p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--sweet-text-faint)' }}>
                {shortAddr(c.address)}
              </p>
            </div>
            <ArrowSquareOutIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--sweet-accent)' }} />
          </motion.a>
        ))}
      </div>

      <p className="text-[10px] text-center" style={{ color: 'var(--sweet-text-faint)' }}>
        {t('tokenomics.footer', '1 SWEET = 1 KZT · TEP-74 jetton · 9 decimals · TON testnet')}
      </p>
    </div>
  );
}
