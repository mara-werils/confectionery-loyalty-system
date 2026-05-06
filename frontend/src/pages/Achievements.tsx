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
import { useTranslation } from 'react-i18next';

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

const CATEGORY_EMOJI: Record<string, string> = {
  transactions: '↺',
  referrals:    '◈',
  spending:     '◆',
  general:      '▲',
};

const ACHIEVEMENT_EMOJI: Record<string, string> = {
  FIRST_PURCHASE:  '●',
  TRANSACTIONS_10: '↺',
  TRANSACTIONS_100:'↑',
  REFERRER_5:      '◈',
  REFERRER_20:     '★',
  POINTS_10000:    '◆',
  POINTS_100000:   '◆◆',
  TIER_SILVER:     'Ag',
  TIER_GOLD:       'Au',
};

const TON_VIEWER_BASE = 'https://testnet.tonviewer.com/transaction/';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, unlocked }: { value: number; max: number; unlocked: boolean }) {
  const pct = max === 0 ? 100 : Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mt-3">
      <motion.div
        className={`h-full rounded-full ${unlocked ? 'bg-amber-400' : 'bg-stone-600'}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  );
}

function NFTBadge({ txHash }: { txHash: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={`${TON_VIEWER_BASE}${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors"
    >
      <CubeTransparentIcon className="w-3 h-3" />
      {t('achievements.nftOnchain')}
      <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
    </a>
  );
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const unlocked = !!achievement.unlockedAt;
  const emoji = ACHIEVEMENT_EMOJI[achievement.code] ?? '◆';

  return (
    <motion.div
      key={achievement.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => setExpanded(v => !v)}
      className={`relative rounded-xl border p-4 cursor-pointer transition-colors ${
        unlocked
          ? 'bg-stone-900 border-yellow-500/30 hover:border-yellow-500/50'
          : 'bg-stone-900 border-stone-800/80 hover:border-stone-700'
      }`}
    >
      {/* Glow ring for unlocked */}
      {unlocked && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-yellow-400/20 pointer-events-none" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
          unlocked ? 'bg-yellow-400/10' : 'bg-stone-800'
        }`}>
          <span className={unlocked ? '' : 'grayscale opacity-40'}>{emoji}</span>

          {/* NFT sparkle indicator */}
          {unlocked && achievement.nftTxHash && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
              <SparklesIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}

          {/* Lock overlay for locked */}
          {!unlocked && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-stone-900/60">
              <LockClosedIcon className="w-4 h-4 text-stone-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-stone-400'}`}>
              {achievement.name}
            </p>
            {unlocked
              ? <CheckBadgeIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              : <span className="text-[10px] text-stone-600 flex-shrink-0">
                  {achievement.progress}/{achievement.requirement}
                </span>
            }
          </div>

          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{achievement.description}</p>

          {/* NFT badge row */}
          {unlocked && achievement.nftTxHash && (
            <div className="mt-1.5">
              <NFTBadge txHash={achievement.nftTxHash} />
            </div>
          )}

          {/* Points reward */}
          {achievement.points > 0 && (
            <p className={`text-[10px] mt-1 font-semibold ${unlocked ? 'text-yellow-400' : 'text-stone-600'}`}>
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
            <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
              {unlocked && achievement.unlockedAt && (
                <p className="text-[11px] text-stone-500">
                  {t('achievements.unlockedAt')}: {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              )}

              {unlocked && achievement.nftTxHash ? (
                <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CubeTransparentIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-300">{t('achievements.sbtLabel')}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-mono break-all">{achievement.nftTxHash}</p>
                  <a
                    href={`${TON_VIEWER_BASE}${achievement.nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
                  >
                    {t('achievements.viewTx')}
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </a>
                </div>
              ) : unlocked ? (
                <div className="rounded-lg bg-stone-800/50 px-3 py-2">
                  <p className="text-[10px] text-stone-500">{t('achievements.nftMinting')}</p>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">
                  {t('achievements.remaining')} {achievement.requirement - achievement.progress}
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
  const { t } = useTranslation();
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
        toast.success(t('achievements.newlyUnlocked', { items: newly.join(', ') }), { duration: 4000 });
      } else {
        toast(t('achievements.noNew'));
      }
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: () => toast.error(t('achievements.checkFailed')),
  });

  const data: AchievementsResponse | undefined = (raw as { data: AchievementsResponse })?.data;
  const achievements = data?.achievements ?? [];

  const categories = ['all', ...Object.keys(CATEGORY_EMOJI)];
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
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('achievements.title')}</h1>
          </div>
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="text-xs px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {checkMutation.isPending ? t('achievements.checking') : t('achievements.check')}
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
            { label: t('achievements.stats.unlocked'),  value: `${unlockedCount}/${achievements.length}`, color: 'text-yellow-400' },
            { label: t('achievements.stats.progress'),  value: `${completionPct}%`,                       color: 'text-green-400' },
            { label: t('achievements.stats.nftMinted'), value: nftCount,                                  color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">{s.label}</p>
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
          className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <CubeTransparentIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300">
              {nftCount} {t('achievements.sbtBanner')}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5">
              {t('achievements.sbtBannerDesc')}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Category filter ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => {
          const emoji = cat === 'all' ? null : CATEGORY_EMOJI[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:border-stone-600'
              }`}
            >
              {emoji ? `${emoji} ${t(`achievements.categories.${cat}`)}` : t('achievements.categories.all')}
            </button>
          );
        })}
      </div>

      {/* ── Achievement list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-xl bg-stone-900 border border-stone-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <TrophyIcon className="w-12 h-12 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">{t('achievements.emptyCategory')}</p>
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
