import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  UserPlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrophyIcon,
  SparklesIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  totalBonusEarned: string;
  referrals: { id: string; companyName: string; tier: string; createdAt: string }[];
}

interface LeaderboardEntry {
  rank: number;
  companyName: string;
  tier: string;
  referralCount: number;
}

const tierColor: Record<string, string> = {
  GOLD: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  SILVER: 'text-zinc-300 bg-zinc-700/50 border-zinc-600',
  BRONZE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

export default function Referrals() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [showApply, setShowApply] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: () => api.referrals.getStats(),
    enabled: !!token,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['referrals', 'leaderboard'],
    queryFn: () => api.referrals.getLeaderboard(),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.referrals.generateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('Referral code generated!');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (code: string) => api.referrals.applyCode(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success(`Referral applied! Referred by ${(res as { data: { referrer: string } }).data?.referrer}`);
      setShowApply(false);
      setApplyCode('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to apply referral code');
    },
  });

  const stats: ReferralStats | undefined = (statsData as { data: ReferralStats })?.data;
  const leaderboard: LeaderboardEntry[] = (leaderboardData as { data: LeaderboardEntry[] })?.data || [];

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Referral Program</h1>
        <p className="text-zinc-400 mt-1">Invite partners — earn 500 SWEET per referral</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <UserPlusIcon className="w-4 h-4 text-zinc-500" />
            <p className="text-xs text-zinc-400">Partners Referred</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">…</span> : (stats?.totalReferrals ?? 0)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-4 h-4 text-zinc-500" />
            <p className="text-xs text-zinc-400">Bonus Earned</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">…</span> : (
              <>
                {Number(stats?.totalBonusEarned || 0).toLocaleString()}
                <span className="text-sm text-zinc-500 ml-1 font-normal">SWEET</span>
              </>
            )}
          </p>
        </div>
      </motion.div>

      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <GiftIcon className="w-5 h-5 text-zinc-400" />
          <h2 className="text-base font-semibold text-white">Your Referral Code</h2>
        </div>

        {stats?.referralCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="font-mono text-2xl font-bold text-white tracking-widest text-center">
                {stats.referralCode}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              {copied ? (
                <CheckIcon className="w-5 h-5 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-5 h-5 text-zinc-300" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate My Referral Code'}
          </button>
        )}

        <p className="text-xs text-zinc-500 mt-3 text-center">
          Share this code with other confectionery owners — you both earn 500 SWEET when they join.
        </p>
      </motion.div>

      {/* Apply Code */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5"
      >
        <button
          onClick={() => setShowApply(!showApply)}
          className="w-full flex items-center justify-between text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <span>Apply a Referral Code</span>
          <span className="text-zinc-600">{showApply ? '▲' : '▼'}</span>
        </button>

        {showApply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              placeholder="Enter referral code (e.g. A1B2C3D4)"
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
            />
            <button
              onClick={() => applyCode && applyMutation.mutate(applyCode)}
              disabled={applyMutation.isPending || !applyCode}
              className="px-4 py-2.5 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm"
            >
              Apply
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Referred Partners List */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-white mb-4">Partners You Referred</h2>
          <div className="space-y-3">
            {stats.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-white">{ref.companyName}</p>
                  <p className="text-xs text-zinc-500">
                    Joined {new Date(ref.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierColor[ref.tier] || tierColor.BRONZE}`}>
                  {ref.tier}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-semibold text-white">Top Referrers</h2>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.rank} className="flex items-center gap-3 py-2">
                <span className="w-6 text-center font-bold text-zinc-500 text-sm">
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                </span>
                <p className="flex-1 text-sm font-medium text-zinc-200">{entry.companyName}</p>
                <span className="text-sm font-bold text-white">{entry.referralCount}</span>
                <span className="text-xs text-zinc-500">refs</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
