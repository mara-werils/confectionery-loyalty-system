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
  accent: string;
  accentBg: string;
  accentBorder: string;
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
    accent: 'text-stone-300',
    accentBg: 'bg-stone-800',
    accentBorder: 'border-stone-700',
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
    accent: 'text-stone-300',
    accentBg: 'bg-stone-800',
    accentBorder: 'border-stone-700',
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
    accent: 'text-stone-300',
    accentBg: 'bg-stone-800',
    accentBorder: 'border-stone-700',
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
    <div className="pb-28 text-white min-h-screen">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-black tracking-tight">{t('staking.title')}</h1>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-black text-amber-400 tabular-nums">
                {formatNumber(sweetBalance)}
              </span>
            </div>
            <span className="text-[10px] text-stone-600 mt-0.5 pr-1">{t('staking.available')}</span>
          </div>
        </div>
        <p className="text-xs text-stone-500 mb-5">{t('staking.subtitle')}</p>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">{t('staking.totalStaked')}</p>
            <p className="text-xl font-black text-white tabular-nums">{formatNumber(totalStaked)}</p>
            <p className="text-[10px] text-stone-600">SWEET</p>
          </div>
          <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">{t('staking.currentApy')}</p>
            <p className="text-xl font-black text-emerald-400 tabular-nums">{weightedApy.toFixed(1)}%</p>
            <p className="text-[10px] text-stone-600">{t('staking.weightedAvg')}</p>
          </div>
          <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">{t('staking.earnedRewards')}</p>
            <p className="text-xl font-black text-amber-400 tabular-nums">{formatNumber(totalEarned, 2)}</p>
            <p className="text-[10px] text-stone-600">SWEET</p>
          </div>
          <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">{t('staking.nextUnlock')}</p>
            {nearestUnlock ? (
              <CountdownDisplay target={nearestUnlock.unlockDate} />
            ) : (
              <p className="text-sm font-semibold text-stone-500">--</p>
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
        <h2 className="text-lg font-bold mb-3">{t('staking.poolsTitle')}</h2>
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
          <h2 className="text-lg font-bold mb-3">{t('staking.myPositions')}</h2>
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
        <h2 className="text-lg font-bold mb-3">{t('staking.statsTitle')}</h2>
        <div className="rounded-2xl bg-stone-900 border border-stone-800 divide-y divide-stone-800">
          <StatRow
            icon={CurrencyDollarIcon}
            label={t('staking.stats.tvl')}
            value={`${formatNumber(tvl)} SWEET`}
            accent="text-stone-300"
          />
          <StatRow
            icon={UserGroupIcon}
            label={t('staking.stats.totalStakers')}
            value={formatNumber(totalStakers)}
            accent="text-stone-300"
          />
          <StatRow
            icon={ArrowTrendingUpIcon}
            label={t('staking.stats.avgApy')}
            value={`${avgApy.toFixed(1)}%`}
            accent="text-amber-400"
          />
          <StatRow
            icon={SparklesIcon}
            label={t('staking.stats.distributed')}
            value={`${formatNumber(totalDistributed)} SWEET`}
            accent="text-stone-300"
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
    return <p className="text-sm font-semibold text-emerald-400">Готово!</p>;
  }
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-lg font-black text-white tabular-nums">{time.days}</span>
      <span className="text-[10px] text-stone-500 mr-1">д</span>
      <span className="text-lg font-black text-white tabular-nums">{String(time.hours).padStart(2, '0')}</span>
      <span className="text-[10px] text-stone-500">:</span>
      <span className="text-lg font-black text-white tabular-nums">{String(time.minutes).padStart(2, '0')}</span>
      <span className="text-[10px] text-stone-500">:</span>
      <span className="text-lg font-black text-white tabular-nums">{String(time.seconds).padStart(2, '0')}</span>
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
      className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${pool.accentBg} border ${pool.accentBorder} flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${pool.accent}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{t(pool.nameKey)}</p>
              <p className="text-[11px] text-stone-500">{t(pool.descKey)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-amber-400 tabular-nums">{pool.apy}%</p>
            <p className="text-[10px] text-stone-600">APY</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-stone-800/50 px-3 py-2">
            <p className="text-[9px] text-stone-500 uppercase tracking-wider">{t('staking.lockPeriod')}</p>
            <p className="text-xs font-bold text-stone-300 mt-0.5">
              {pool.lockDays === 0 ? t('staking.noLock') : `${pool.lockDays} ${t('staking.days')}`}
            </p>
          </div>
          <div className="rounded-xl bg-stone-800/50 px-3 py-2">
            <p className="text-[9px] text-stone-500 uppercase tracking-wider">{t('staking.poolTvl')}</p>
            <p className="text-xs font-bold text-stone-300 mt-0.5">{(pool.totalStaked / 1000).toFixed(0)}K</p>
          </div>
          <div className="rounded-xl bg-stone-800/50 px-3 py-2">
            <p className="text-[9px] text-stone-500 uppercase tracking-wider">{t('staking.minStake')}</p>
            <p className="text-xs font-bold text-stone-300 mt-0.5">{pool.minStake} SWEET</p>
          </div>
        </div>

        {/* Stake button */}
        <button
          onClick={onStake}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-amber-500 text-black hover:bg-amber-400"
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
    <div className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${pool.accentBg} border ${pool.accentBorder} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${pool.accent}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{t(pool.nameKey)}</p>
              <p className="text-[10px] text-stone-500">
                {position.startDate.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                {isLocked && ` — ${position.unlockDate.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isLocked
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-stone-300 bg-stone-800 border-stone-700'
          }`}>
            {isFlexible ? t('staking.statusFlexible') : isLocked ? t('staking.statusLocked') : t('staking.statusUnlocked')}
          </div>
        </div>

        {/* Amount + Earned */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">{t('staking.stakedAmount')}</p>
            <p className="text-lg font-black text-white tabular-nums">{formatNumber(position.amount)} <span className="text-xs text-stone-500 font-semibold">SWEET</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">{t('staking.earnedLabel')}</p>
            <p className="text-lg font-black tabular-nums text-amber-400">+{formatNumber(position.earned, 2)}</p>
          </div>
        </div>

        {/* Progress bar for locked */}
        {isLocked && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-stone-500">{t('staking.progress')}</span>
              <span className="text-[10px] text-stone-400 font-semibold tabular-nums">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <ClockIcon className="w-3 h-3 text-stone-600" />
              <CountdownDisplay target={position.unlockDate} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isFlexible && position.earned > 0.01 && (
            <button
              onClick={onClaim}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              {t('staking.claimRewards')}
            </button>
          )}
          <button
            onClick={onUnstake}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700"
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
  accent,
}: {
  icon: typeof SparklesIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon className={`w-4.5 h-4.5 ${accent}`} />
        <span className="text-xs text-stone-400">{label}</span>
      </div>
      <span className={`text-sm font-bold ${accent} tabular-nums`}>{value}</span>
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
            <div className="w-full max-w-2xl bg-stone-950 border-t border-stone-800 rounded-t-3xl px-5 pt-4 pb-10">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${pool.accentBg} border ${pool.accentBorder} flex items-center justify-center`}>
                    <pool.icon className={`w-5 h-5 ${pool.accent}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t(pool.nameKey)}</p>
                    <p className="text-xs text-stone-500">{pool.apy}% APY · {pool.lockDays === 0 ? t('staking.noLock') : `${pool.lockDays} ${t('staking.days')}`}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-800/50 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-stone-400">{t('staking.enterAmount')}</label>
                  <span className="text-[10px] text-stone-500">{t('staking.balance')}: <span className="text-amber-400 font-semibold">{formatNumber(balance)}</span></span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`${t('staking.min')} ${pool.minStake}`}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3.5 text-white text-lg font-bold tabular-nums placeholder:text-stone-600 focus:outline-none focus:border-stone-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setAmount(String(balance))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Pool summary */}
              <div className="rounded-xl bg-stone-900 border border-stone-800 divide-y divide-stone-800 mb-4">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">{t('staking.poolLabel')}</span>
                  <span className="text-xs font-semibold text-stone-300">{t(pool.nameKey)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">APY</span>
                  <span className="text-xs font-bold text-amber-400">{pool.apy}%</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">{t('staking.lockPeriod')}</span>
                  <span className="text-xs font-semibold text-stone-300">{pool.lockDays === 0 ? t('staking.noLock') : `${pool.lockDays} ${t('staking.days')}`}</span>
                </div>
              </div>

              {/* Earnings calculator */}
              {numAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl bg-stone-900 border border-stone-800 mb-5 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-stone-800">
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">{t('staking.expectedEarnings')}</p>
                  </div>
                  {[
                    { label: t('staking.daily'), value: dailyEarnings },
                    { label: t('staking.weekly'), value: weeklyEarnings },
                    { label: t('staking.monthly'), value: monthlyEarnings },
                    { label: t('staking.yearly'), value: yearlyEarnings },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2 border-b border-stone-800/50 last:border-0">
                      <span className="text-xs text-stone-500">{row.label}</span>
                      <span className="text-xs font-bold text-amber-400 tabular-nums">+{formatNumber(row.value, 4)} SWEET</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Confirm button */}
              <button
                onClick={() => numAmount > 0 && isValid && onConfirm(pool.id, numAmount)}
                disabled={!isValid || numAmount <= 0}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isValid && numAmount > 0
                    ? 'bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98]'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <CheckCircleIcon className="w-4.5 h-4.5" />
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
            <div className="w-full max-w-2xl bg-stone-950 border-t border-stone-800 rounded-t-3xl px-5 pt-4 pb-10">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{t('staking.unstakeTitle')}</h3>
                <button onClick={onClose} className="p-2 hover:bg-stone-800/50 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {isLocked && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-400 mb-1">{t('staking.earlyWithdrawal')}</p>
                      <p className="text-xs text-red-300/70">{t('staking.penaltyWarning', { percent: '10' })}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-stone-900 border border-stone-800 divide-y divide-stone-800 mb-5">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">{t('staking.poolLabel')}</span>
                  <span className="text-xs font-semibold text-stone-300">{t(pool.nameKey)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">{t('staking.stakedAmount')}</span>
                  <span className="text-xs font-bold text-white">{formatNumber(position.amount)} SWEET</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-stone-500">{t('staking.earnedLabel')}</span>
                  <span className="text-xs font-bold text-amber-400">+{formatNumber(position.earned, 2)} SWEET</span>
                </div>
                {isLocked && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-stone-500">{t('staking.penalty')}</span>
                    <span className="text-xs font-bold text-red-400">-{formatNumber(penalty, 2)} SWEET</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-stone-300">{t('staking.youReceive')}</span>
                  <span className="text-sm font-black text-amber-400">{formatNumber(returnAmount, 2)} SWEET</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 transition-all active:scale-[0.98]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => onConfirm(position)}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
                    isLocked
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : 'bg-amber-500 text-black hover:bg-amber-400'
                  }`}
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
