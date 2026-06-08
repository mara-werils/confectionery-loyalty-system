import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  SparklesIcon,
  LockClosedIcon,
  ClockIcon,
  BoltIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StakingPool {
  id: string;
  nameKey: string;
  descKey: string;
  apy: number;
  lockDays: number;
  minStake: number;
  totalStaked: number;
  stakers: number;
  icon: typeof BoltIcon;
}

interface StakePosition {
  id: string;
  poolId: string;
  amount: number;
  startDate: Date;
  unlockDate: Date;
  earned: number;
  status: 'active' | 'unlocked' | 'flexible';
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const POOLS: StakingPool[] = [
  {
    id: 'flexible',
    nameKey: 'staking.pools.flexible.name',
    descKey: 'staking.pools.flexible.desc',
    apy: 5,
    lockDays: 0,
    minStake: 10,
    totalStaked: 1_245_800,
    stakers: 3_421,
    icon: BoltIcon,
  },
  {
    id: '30day',
    nameKey: 'staking.pools.30day.name',
    descKey: 'staking.pools.30day.desc',
    apy: 12,
    lockDays: 30,
    minStake: 50,
    totalStaked: 3_890_500,
    stakers: 1_876,
    icon: LockClosedIcon,
  },
  {
    id: '90day',
    nameKey: 'staking.pools.90day.name',
    descKey: 'staking.pools.90day.desc',
    apy: 25,
    lockDays: 90,
    minStake: 100,
    totalStaked: 8_720_300,
    stakers: 945,
    icon: FireIcon,
  },
];

const INITIAL_POSITIONS: StakePosition[] = [
  {
    id: 'pos-1',
    poolId: 'flexible',
    amount: 500,
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    unlockDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    earned: 1.03,
    status: 'flexible',
  },
  {
    id: 'pos-2',
    poolId: '30day',
    amount: 1200,
    startDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    unlockDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    earned: 7.1,
    status: 'active',
  },
  {
    id: 'pos-3',
    poolId: '90day',
    amount: 3000,
    startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    unlockDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    earned: 92.5,
    status: 'active',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number, decimals = 0): string {
  if (decimals > 0) return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return n.toLocaleString('ru-RU');
}

function getTimeRemaining(target: Date): { days: number; hours: number; minutes: number; seconds: number } {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function getPoolById(id: string): StakingPool {
  return POOLS.find(p => p.id === id) ?? POOLS[0];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Staking() {
  const { t } = useTranslation();
  const { sweetBalance, setSweetBalance } = useAuthStore();

  const [positions, setPositions] = useState<StakePosition[]>(INITIAL_POSITIONS);
  const [stakeModal, setStakeModal] = useState<StakingPool | null>(null);
  const [unstakeConfirm, setUnstakeConfirm] = useState<StakePosition | null>(null);

  // Calculate totals
  const totalStaked = useMemo(() => positions.reduce((s, p) => s + p.amount, 0), [positions]);
  const totalEarned = useMemo(() => positions.reduce((s, p) => s + p.earned, 0), [positions]);
  const weightedApy = useMemo(() => {
    if (totalStaked === 0) return 0;
    return positions.reduce((s, p) => s + getPoolById(p.poolId).apy * p.amount, 0) / totalStaked;
  }, [positions, totalStaked]);

  // Find nearest unlock
  const nearestUnlock = useMemo(() => {
    const locked = positions.filter(p => p.status === 'active');
    if (locked.length === 0) return null;
    return locked.reduce((min, p) => p.unlockDate < min.unlockDate ? p : min);
  }, [positions]);

  // Tick the countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate earned rewards growing
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => prev.map(p => {
        const pool = getPoolById(p.poolId);
        const dailyRate = pool.apy / 100 / 365;
        const increment = p.amount * dailyRate / 86400; // per second
        return { ...p, earned: p.earned + increment };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStake = useCallback((poolId: string, amount: number) => {
    if (amount > sweetBalance) {
      toast.error(t('staking.insufficientBalance'));
      return;
    }
    const pool = getPoolById(poolId);
    const now = new Date();
    const unlock = pool.lockDays === 0 ? now : new Date(now.getTime() + pool.lockDays * 24 * 60 * 60 * 1000);
    const newPosition: StakePosition = {
      id: `pos-${Date.now()}`,
      poolId,
      amount,
      startDate: now,
      unlockDate: unlock,
      earned: 0,
      status: pool.lockDays === 0 ? 'flexible' : 'active',
    };
    setPositions(prev => [newPosition, ...prev]);
    setSweetBalance(sweetBalance - amount);
    setStakeModal(null);
    toast.success(t('staking.stakeSuccess', { amount: formatNumber(amount) }));
  }, [sweetBalance, setSweetBalance, t]);

  const handleUnstake = useCallback((position: StakePosition) => {
    const isLocked = position.status === 'active' && position.unlockDate > new Date();
    const penalty = isLocked ? position.amount * 0.1 : 0;
    const returnAmount = position.amount - penalty + position.earned;

    setPositions(prev => prev.filter(p => p.id !== position.id));
    setSweetBalance(sweetBalance + returnAmount);
    setUnstakeConfirm(null);

    if (isLocked) {
      toast(t('staking.unstakeWithPenalty', { penalty: formatNumber(penalty, 2) }), { icon: '!' });
    } else {
      toast.success(t('staking.unstakeSuccess'));
    }
  }, [sweetBalance, setSweetBalance, t]);

  const handleClaimRewards = useCallback((positionId: string) => {
    const pos = positions.find(p => p.id === positionId);
    if (!pos) return;
    setSweetBalance(sweetBalance + pos.earned);
    setPositions(prev => prev.map(p => p.id === positionId ? { ...p, earned: 0 } : p));
    toast.success(t('staking.claimSuccess', { amount: formatNumber(pos.earned, 2) }));
  }, [positions, sweetBalance, setSweetBalance, t]);

  // Global stats
  const tvl = POOLS.reduce((s, p) => s + p.totalStaked, 0) + totalStaked;
  const totalStakers = POOLS.reduce((s, p) => s + p.stakers, 0);
  const avgApy = POOLS.reduce((s, p) => s + p.apy, 0) / POOLS.length;
  const totalDistributed = 1_456_200;

  return (
    <div className="pb-28 min-h-screen" style={{ color: 'var(--sweet-text)' }}>
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between mb-1">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: 'var(--sweet-text)' }}
          >
            {t('staking.title')}
          </h1>
          <div className="flex flex-col items-end">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.22)',
              }}
            >
              <SparklesIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
              <span
                className="text-sm font-black tabular-nums"
                style={{ color: 'var(--sweet-accent)' }}
              >
                {formatNumber(sweetBalance)}
              </span>
            </div>
            <span
              className="text-[10px] mt-0.5 pr-1"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.available')}
            </span>
          </div>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--sweet-text-faint)' }}>
          {t('staking.subtitle')}
        </p>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Total Staked */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <p
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.totalStaked')}
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: 'var(--sweet-text)' }}
            >
              {formatNumber(totalStaked)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>SWEET</p>
          </div>

          {/* Current APY */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <p
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.currentApy')}
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {weightedApy.toFixed(1)}%
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
              {t('staking.weightedAvg')}
            </p>
          </div>

          {/* Earned Rewards */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <p
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.earnedRewards')}
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {formatNumber(totalEarned, 2)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>SWEET</p>
          </div>

          {/* Next Unlock */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            <p
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.nextUnlock')}
            </p>
            {nearestUnlock ? (
              <CountdownDisplay target={nearestUnlock.unlockDate} />
            ) : (
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--sweet-text-muted)' }}
              >
                --
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Staking Pools ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <h2
          className="text-lg font-bold mb-3"
          style={{ color: 'var(--sweet-text)' }}
        >
          {t('staking.poolsTitle')}
        </h2>
        <div className="space-y-3">
          {POOLS.map((pool, i) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              index={i}
              onStake={() => setStakeModal(pool)}
              t={t}
            />
          ))}
        </div>
      </motion.div>

      {/* ── My Positions ──────────────────────────────────────────── */}
      {positions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <h2
            className="text-lg font-bold mb-3"
            style={{ color: 'var(--sweet-text)' }}
          >
            {t('staking.myPositions')}
          </h2>
          <div className="space-y-3">
            {positions.map(pos => (
              <PositionCard
                key={pos.id}
                position={pos}
                pool={getPoolById(pos.poolId)}
                onUnstake={() => setUnstakeConfirm(pos)}
                onClaim={() => handleClaimRewards(pos.id)}
                t={t}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Global Stats ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2
          className="text-lg font-bold mb-3"
          style={{ color: 'var(--sweet-text)' }}
        >
          {t('staking.statsTitle')}
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
          }}
        >
          <StatRow
            icon={CurrencyDollarIcon}
            label={t('staking.stats.tvl')}
            value={`${formatNumber(tvl)} SWEET`}
            accentColor="var(--sweet-text-secondary)"
          />
          <StatRow
            icon={UserGroupIcon}
            label={t('staking.stats.totalStakers')}
            value={formatNumber(totalStakers)}
            accentColor="var(--sweet-text-secondary)"
          />
          <StatRow
            icon={ArrowTrendingUpIcon}
            label={t('staking.stats.avgApy')}
            value={`${avgApy.toFixed(1)}%`}
            accentColor="var(--sweet-accent)"
          />
          <StatRow
            icon={SparklesIcon}
            label={t('staking.stats.distributed')}
            value={`${formatNumber(totalDistributed)} SWEET`}
            accentColor="var(--sweet-text-secondary)"
          />
        </div>
      </motion.div>

      {/* ── Stake Modal ───────────────────────────────────────────── */}
      <StakeModal
        pool={stakeModal}
        balance={sweetBalance}
        onClose={() => setStakeModal(null)}
        onConfirm={handleStake}
        t={t}
      />

      {/* ── Unstake Confirm Modal ─────────────────────────────────── */}
      <UnstakeConfirmModal
        position={unstakeConfirm}
        onClose={() => setUnstakeConfirm(null)}
        onConfirm={handleUnstake}
        t={t}
      />
    </div>
  );
}

// ─── CountdownDisplay ───────────────────────────────────────────────────────

function CountdownDisplay({ target }: { target: Date }) {
  const time = getTimeRemaining(target);
  if (time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
    return (
      <p className="text-sm font-semibold" style={{ color: 'var(--sweet-accent)' }}>
        Готово!
      </p>
    );
  }
  return (
    <div className="flex items-baseline gap-0.5">
      <span
        className="text-lg font-black tabular-nums"
        style={{ color: 'var(--sweet-text)' }}
      >
        {time.days}
      </span>
      <span className="text-[10px] mr-1" style={{ color: 'var(--sweet-text-faint)' }}>д</span>
      <span
        className="text-lg font-black tabular-nums"
        style={{ color: 'var(--sweet-text)' }}
      >
        {String(time.hours).padStart(2, '0')}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>:</span>
      <span
        className="text-lg font-black tabular-nums"
        style={{ color: 'var(--sweet-text)' }}
      >
        {String(time.minutes).padStart(2, '0')}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>:</span>
      <span
        className="text-lg font-black tabular-nums"
        style={{ color: 'var(--sweet-text)' }}
      >
        {String(time.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

// ─── PoolCard ───────────────────────────────────────────────────────────────

function PoolCard({
  pool,
  index,
  onStake,
  t,
}: {
  pool: StakingPool;
  index: number;
  onStake: () => void;
  t: (key: string) => string;
}) {
  const Icon = pool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'var(--sweet-input)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: 'var(--sweet-text-secondary)' }}
              />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                {t(pool.nameKey)}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {t(pool.descKey)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {pool.apy}%
            </p>
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>APY</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            {
              label: t('staking.lockPeriod'),
              value: pool.lockDays === 0 ? t('staking.noLock') : `${pool.lockDays} ${t('staking.days')}`,
            },
            { label: t('staking.poolTvl'), value: `${(pool.totalStaked / 1000).toFixed(0)}K` },
            { label: t('staking.minStake'), value: `${pool.minStake} SWEET` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl px-3 py-2"
              style={{ background: 'var(--sweet-input)' }}
            >
              <p
                className="text-[9px] uppercase tracking-wider"
                style={{ color: 'var(--sweet-text-faint)' }}
              >
                {item.label}
              </p>
              <p
                className="text-xs font-bold mt-0.5"
                style={{ color: 'var(--sweet-text-secondary)' }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Stake button */}
        <button
          onClick={onStake}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: 'var(--sweet-accent)',
            color: 'var(--sweet-bg, #0d0b0a)',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          {t('staking.stakeButton')}
        </button>
      </div>
    </motion.div>
  );
}

// ─── PositionCard ───────────────────────────────────────────────────────────

function PositionCard({
  position,
  pool,
  onUnstake,
  onClaim,
  t,
}: {
  position: StakePosition;
  pool: StakingPool;
  onUnstake: () => void;
  onClaim: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const isLocked = position.status === 'active' && position.unlockDate > new Date();
  const isFlexible = position.status === 'flexible';

  // Progress for locked positions
  const totalDuration = position.unlockDate.getTime() - position.startDate.getTime();
  const elapsed = Date.now() - position.startDate.getTime();
  const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 100;

  const Icon = pool.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--sweet-input)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: 'var(--sweet-text-secondary)' }}
              />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                {t(pool.nameKey)}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {position.startDate.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                {isLocked &&
                  ` — ${position.unlockDate.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={
              isLocked
                ? {
                    color: 'var(--sweet-accent)',
                    background: 'rgba(245,158,11,0.10)',
                    border: '1px solid rgba(245,158,11,0.22)',
                  }
                : {
                    color: 'var(--sweet-text-secondary)',
                    background: 'var(--sweet-input)',
                    border: '1px solid var(--sweet-border)',
                  }
            }
          >
            {isFlexible
              ? t('staking.statusFlexible')
              : isLocked
              ? t('staking.statusLocked')
              : t('staking.statusUnlocked')}
          </div>
        </div>

        {/* Amount + Earned */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.stakedAmount')}
            </p>
            <p className="text-lg font-black tabular-nums" style={{ color: 'var(--sweet-text)' }}>
              {formatNumber(position.amount)}{' '}
              <span className="text-xs font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>
                SWEET
              </span>
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              {t('staking.earnedLabel')}
            </p>
            <p
              className="text-lg font-black tabular-nums"
              style={{ color: 'var(--sweet-accent)' }}
            >
              +{formatNumber(position.earned, 2)}
            </p>
          </div>
        </div>

        {/* Progress bar for locked */}
        {isLocked && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {t('staking.progress')}
              </span>
              <span
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: 'var(--sweet-text-muted)' }}
              >
                {progress.toFixed(1)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--sweet-input)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--sweet-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <ClockIcon className="w-3 h-3" style={{ color: 'var(--sweet-text-faint)' }} />
              <CountdownDisplay target={position.unlockDate} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isFlexible && position.earned > 0.01 && (
            <button
              onClick={onClaim}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--sweet-accent)',
                color: 'var(--sweet-bg, #0d0b0a)',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
            >
              {t('staking.claimRewards')}
            </button>
          )}
          <button
            onClick={onUnstake}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{
              background: 'var(--sweet-input)',
              color: 'var(--sweet-text-secondary)',
              border: '1px solid var(--sweet-border)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--sweet-input)')}
          >
            {t('staking.unstakeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StatRow ────────────────────────────────────────────────────────────────

function StatRow({
  icon: Icon,
  label,
  value,
  accentColor,
}: {
  icon: typeof SparklesIcon;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5"
      style={{ borderBottom: '1px solid var(--sweet-border)' }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
          {label}
        </span>
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color: accentColor }}>
        {value}
      </span>
    </div>
  );
}

// ─── StakeModal ─────────────────────────────────────────────────────────────

function StakeModal({
  pool,
  balance,
  onClose,
  onConfirm,
  t,
}: {
  pool: StakingPool | null;
  balance: number;
  onClose: () => void;
  onConfirm: (poolId: string, amount: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (pool) setAmount('');
  }, [pool]);

  const numAmount = Number(amount) || 0;
  const isValid = numAmount >= (pool?.minStake ?? 0) && numAmount <= balance;

  // Earnings calculator
  const dailyEarnings = pool ? (numAmount * pool.apy / 100 / 365) : 0;
  const weeklyEarnings = dailyEarnings * 7;
  const monthlyEarnings = dailyEarnings * 30;
  const yearlyEarnings = dailyEarnings * 365;

  return (
    <AnimatePresence>
      {pool && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div
              className="w-full max-w-2xl rounded-t-3xl px-5 pt-4 pb-10"
              style={{
                background: 'var(--sweet-card)',
                borderTop: '1px solid var(--sweet-border)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'var(--sweet-border)' }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                    }}
                  >
                    <pool.icon
                      className="w-5 h-5"
                      style={{ color: 'var(--sweet-text-secondary)' }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                      {t(pool.nameKey)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                      {pool.apy}% APY ·{' '}
                      {pool.lockDays === 0
                        ? t('staking.noLock')
                        : `${pool.lockDays} ${t('staking.days')}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--sweet-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-input)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                    {t('staking.enterAmount')}
                  </label>
                  <span className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                    {t('staking.balance')}:{' '}
                    <span className="font-semibold" style={{ color: 'var(--sweet-accent)' }}>
                      {formatNumber(balance)}
                    </span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`${t('staking.min')} ${pool.minStake}`}
                    className="w-full rounded-xl px-4 py-3.5 text-lg font-bold tabular-nums focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  />
                  <button
                    onClick={() => setAmount(String(balance))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors"
                    style={{
                      background: 'rgba(245,158,11,0.15)',
                      color: 'var(--sweet-accent)',
                      border: '1px solid rgba(245,158,11,0.25)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.15)')}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Pool summary */}
              <div
                className="rounded-xl mb-4 overflow-hidden"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                {[
                  { label: t('staking.poolLabel'), value: t(pool.nameKey), accent: 'var(--sweet-text-secondary)' },
                  { label: 'APY', value: `${pool.apy}%`, accent: 'var(--sweet-accent)' },
                  {
                    label: t('staking.lockPeriod'),
                    value: pool.lockDays === 0
                      ? t('staking.noLock')
                      : `${pool.lockDays} ${t('staking.days')}`,
                    accent: 'var(--sweet-text-secondary)',
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: i < 2 ? '1px solid var(--sweet-border)' : undefined }}
                  >
                    <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                      {row.label}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: row.accent }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Earnings calculator */}
              {numAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl mb-5 overflow-hidden"
                  style={{
                    background: 'var(--sweet-input)',
                    border: '1px solid var(--sweet-border)',
                  }}
                >
                  <div
                    className="px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--sweet-border)' }}
                  >
                    <p
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: 'var(--sweet-text-faint)' }}
                    >
                      {t('staking.expectedEarnings')}
                    </p>
                  </div>
                  {[
                    { label: t('staking.daily'), value: dailyEarnings },
                    { label: t('staking.weekly'), value: weeklyEarnings },
                    { label: t('staking.monthly'), value: monthlyEarnings },
                    { label: t('staking.yearly'), value: yearlyEarnings },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-4 py-2 last:border-0"
                      style={{ borderBottom: '1px solid rgba(120,113,108,0.10)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                        {row.label}
                      </span>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: 'var(--sweet-accent)' }}
                      >
                        +{formatNumber(row.value, 4)} SWEET
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Confirm button */}
              <button
                onClick={() => numAmount > 0 && isValid && onConfirm(pool.id, numAmount)}
                disabled={!isValid || numAmount <= 0}
                className="w-full h-12 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={
                  isValid && numAmount > 0
                    ? {
                        background: 'var(--sweet-accent)',
                        color: 'var(--sweet-bg, #0d0b0a)',
                      }
                    : {
                        background: 'var(--sweet-input)',
                        color: 'var(--sweet-text-faint)',
                        cursor: 'not-allowed',
                      }
                }
              >
                <CheckCircleIcon className="w-4 h-4" />
                {t('staking.confirmStake')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── UnstakeConfirmModal ────────────────────────────────────────────────────

function UnstakeConfirmModal({
  position,
  onClose,
  onConfirm,
  t,
}: {
  position: StakePosition | null;
  onClose: () => void;
  onConfirm: (position: StakePosition) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!position) return null;

  const pool = getPoolById(position.poolId);
  const isLocked = position.status === 'active' && position.unlockDate > new Date();
  const penalty = isLocked ? position.amount * 0.1 : 0;
  const returnAmount = position.amount - penalty + position.earned;

  return (
    <AnimatePresence>
      {position && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div
              className="w-full max-w-2xl rounded-t-3xl px-5 pt-4 pb-24"
              style={{
                background: 'var(--sweet-card)',
                borderTop: '1px solid var(--sweet-border)',
              }}
            >
              <div className="flex justify-center mb-4">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'var(--sweet-border)' }}
                />
              </div>

              <div className="flex items-center justify-between mb-5">
                <h3
                  className="text-lg font-bold"
                  style={{ color: 'var(--sweet-text)' }}
                >
                  {t('staking.unstakeTitle')}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--sweet-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-input)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {isLocked && (
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.22)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: '#f87171' }}
                    />
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: '#f87171' }}>
                        {t('staking.earlyWithdrawal')}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(248,113,113,0.70)' }}>
                        {t('staking.penaltyWarning', { percent: '10' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="rounded-xl mb-5 overflow-hidden"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--sweet-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                    {t('staking.poolLabel')}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
                    {t(pool.nameKey)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--sweet-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                    {t('staking.stakedAmount')}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--sweet-text)' }}>
                    {formatNumber(position.amount)} SWEET
                  </span>
                </div>
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--sweet-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                    {t('staking.earnedLabel')}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--sweet-accent)' }}>
                    +{formatNumber(position.earned, 2)} SWEET
                  </span>
                </div>
                {isLocked && (
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--sweet-border)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                      {t('staking.penalty')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: '#f87171' }}>
                      -{formatNumber(penalty, 2)} SWEET
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
                    {t('staking.youReceive')}
                  </span>
                  <span className="text-sm font-black" style={{ color: 'var(--sweet-accent)' }}>
                    {formatNumber(returnAmount, 2)} SWEET
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: 'var(--sweet-input)',
                    color: 'var(--sweet-text-secondary)',
                    border: '1px solid var(--sweet-border)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--sweet-input)')}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => onConfirm(position)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={
                    isLocked
                      ? { background: '#ef4444', color: '#fff' }
                      : { background: 'var(--sweet-accent)', color: 'var(--sweet-bg, #0d0b0a)' }
                  }
                  onMouseEnter={e =>
                    (e.currentTarget.style.filter = 'brightness(1.1)')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.filter = 'brightness(1)')
                  }
                >
                  {t('staking.confirmUnstake')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
