import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrophyIcon,
  LockClosedIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  CheckBadgeIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Achievement {
  id:          string;
  code:        string;
  name:        string;
  description: string;
  category:    string;
  requirement: number;
  points:      number;
  progress:    number;
  unlockedAt:  string | null;
  nftTxHash:   string | null;
}

interface AchievementsResponse {
  achievements: Achievement[];
  stats: { total: number; unlocked: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  transactions: { label: 'Transactions', emoji: '⚡',  color: 'text-blue-400' },
  referrals:    { label: 'Referrals',    emoji: '🤝',  color: 'text-purple-400' },
  spending:     { label: 'Points',       emoji: '💎',  color: 'text-cyan-400' },
  general:      { label: 'Milestones',   emoji: '🏅',  color: 'text-yellow-400' },
};

const ACHIEVEMENT_EMOJI: Record<string, string> = {
  FIRST_PURCHASE:  '🎯',
  TRANSACTIONS_10: '⚡',
  TRANSACTIONS_100:'🚀',
  REFERRER_5:      '🤝',
  REFERRER_20:     '🌟',
  POINTS_10000:    '💰',
  POINTS_100000:   '👑',
  TIER_SILVER:     '🥈',
  TIER_GOLD:       '🥇',
};

const TON_VIEWER_BASE = 'https://testnet.tonviewer.com/transaction/';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, unlocked }: { value: number; max: number; unlocked: boolean }) {
  const pct = max === 0 ? 100 : Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-3">
      <motion.div
        className={`h-full rounded-full ${unlocked ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-zinc-600'}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  );
}

function NFTBadge({ txHash }: { txHash: string }) {
  return (
    <a
      href={`${TON_VIEWER_BASE}${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/25 transition-colors"
    >
      <CubeTransparentIcon className="w-3 h-3" />
      NFT on-chain
      <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
    </a>
  );
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const unlocked = !!achievement.unlockedAt;
  const emoji = ACHIEVEMENT_EMOJI[achievement.code] ?? '🏆';

  return (
    <motion.div
      key={achievement.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => setExpanded(v => !v)}
      className={`relative rounded-xl border p-4 cursor-pointer transition-colors ${
        unlocked
          ? 'bg-zinc-900 border-yellow-500/30 hover:border-yellow-500/50'
          : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Glow ring for unlocked */}
      {unlocked && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-yellow-400/20 pointer-events-none" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
          unlocked ? 'bg-yellow-400/10' : 'bg-zinc-800'
        }`}>
          <span className={unlocked ? '' : 'grayscale opacity-40'}>{emoji}</span>

          {/* NFT sparkle indicator */}
          {unlocked && achievement.nftTxHash && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}

          {/* Lock overlay for locked */}
          {!unlocked && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-zinc-900/60">
              <LockClosedIcon className="w-4 h-4 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-zinc-400'}`}>
              {achievement.name}
            </p>
            {unlocked
              ? <CheckBadgeIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              : <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {achievement.progress}/{achievement.requirement}
                </span>
            }
          </div>

          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{achievement.description}</p>

          {/* NFT badge row */}
          {unlocked && achievement.nftTxHash && (
            <div className="mt-1.5">
              <NFTBadge txHash={achievement.nftTxHash} />
            </div>
          )}

          {/* Points reward */}
          {achievement.points > 0 && (
            <p className={`text-[10px] mt-1 font-semibold ${unlocked ? 'text-yellow-400' : 'text-zinc-600'}`}>
              +{achievement.points.toLocaleString()} SWEET
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!unlocked && <ProgressBar value={achievement.progress} max={achievement.requirement} unlocked={false} />}

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
              {unlocked && achievement.unlockedAt && (
                <p className="text-[11px] text-zinc-500">
                  Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              )}

              {unlocked && achievement.nftTxHash ? (
                <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CubeTransparentIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-semibold text-blue-300">Soul-Bound Token (SBT)</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono break-all">{achievement.nftTxHash}</p>
                  <a
                    href={`${TON_VIEWER_BASE}${achievement.nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  >
                    View transaction on TON testnet
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </a>
                </div>
              ) : unlocked ? (
                <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                  <p className="text-[10px] text-zinc-500">NFT minting in progress…</p>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  {achievement.requirement - achievement.progress} more to go
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Achievements() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn:  () => api.achievements.getAll(),
    enabled:  !!token,
    staleTime: 30_000,
  });

  const checkMutation = useMutation({
    mutationFn: () => api.achievements.check(),
    onSuccess: (res) => {
      const newly: string[] = (res as { data: { newlyUnlocked: string[] } }).data.newlyUnlocked;
      if (newly.length > 0) {
        toast.success(`🏆 Unlocked: ${newly.join(', ')}`, { duration: 4000 });
      } else {
        toast('No new achievements yet.', { icon: '🔍' });
      }
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: () => toast.error('Failed to check achievements'),
  });

  const data: AchievementsResponse | undefined = (raw as { data: AchievementsResponse })?.data;
  const achievements = data?.achievements ?? [];

  const categories = ['all', ...Object.keys(CATEGORY_META)];
  const filtered = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  const unlockedCount  = achievements.filter(a => a.unlockedAt).length;
  const nftCount       = achievements.filter(a => a.nftTxHash).length;
  const completionPct  = achievements.length > 0
    ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <div className="px-1 py-4 space-y-5">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center">
              <TrophySolid className="w-4 h-4 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Achievements</h1>
          </div>
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {checkMutation.isPending ? 'Checking…' : 'Check progress'}
          </button>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      {!isLoading && achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Unlocked',   value: `${unlockedCount}/${achievements.length}`, color: 'text-yellow-400' },
            { label: 'Completion', value: `${completionPct}%`,                       color: 'text-green-400' },
            { label: 'NFTs minted',value: nftCount,                                  color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── NFT banner ── */}
      {nftCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <CubeTransparentIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-300">
              {nftCount} Soul-Bound Token{nftCount > 1 ? 's' : ''} minted on TON testnet
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Your achievements are permanently recorded on the blockchain — tap any unlocked badge to view.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Category filter ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => {
          const meta = cat === 'all' ? null : CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {meta ? `${meta.emoji} ${meta.label}` : '🏆 All'}
            </button>
          );
        })}
      </div>

      {/* ── Achievement list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <TrophyIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No achievements in this category yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Unlocked first */}
          {filtered
            .sort((a, b) => {
              if (a.unlockedAt && !b.unlockedAt) return -1;
              if (!a.unlockedAt && b.unlockedAt)  return 1;
              return 0;
            })
            .map((achievement, i) => (
              <AchievementCard key={achievement.id} achievement={achievement} index={i} />
            ))
          }
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
