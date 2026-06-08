import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  UserPlusIcon,
  ClipboardTextIcon,
  CheckIcon,
  TrophyIcon,
  SparkleIcon,
  GiftIcon,
} from '@phosphor-icons/react';
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
  SILVER: 'text-stone-500 bg-stone-400/10 border-stone-400/20',
  BRONZE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

export default function Referrals() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [showApply, setShowApply] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: () => api.referrals.getStats(),
    enabled: !!token,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['referrals', 'leaderboard'],
    queryFn: () => api.referrals.getLeaderboard(),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.referrals.generateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success(t('referrals.codeGenerated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('referrals.generateFailed'));
    },
  });

  const applyMutation = useMutation({
    mutationFn: (code: string) => api.referrals.applyCode(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success(t('referrals.applied', { referrer: (res as { data: { referrer: string } }).data?.referrer }));
      setShowApply(false);
      setApplyCode('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('referrals.applyFailed'));
    },
  });

  const stats: ReferralStats | undefined = (statsData as { data: ReferralStats })?.data;
  const leaderboard: LeaderboardEntry[] = (leaderboardData as { data: LeaderboardEntry[] })?.data || [];

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast.success(t('referrals.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="pl-1">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>{t('referrals.title')}</h1>
        <p className="mt-1" style={{ color: 'var(--sweet-text-muted)' }}>{t('referrals.subtitle')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: <UserPlusIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />, label: t('referrals.partnersReferred'), value: statsLoading ? '…' : (stats?.totalReferrals ?? 0) },
          { icon: <SparkleIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />, label: t('referrals.bonusEarned'), value: statsLoading ? '…' : Number(stats?.totalBonusEarned || 0).toLocaleString(), suffix: 'SWEET' },
        ].map(({ icon, label, value, suffix }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--sweet-text)' }}>
              {statsLoading ? <span className="animate-pulse">…</span> : (
                <>
                  {value}
                  {suffix && <span className="text-sm font-normal ml-1" style={{ color: 'var(--sweet-text-muted)' }}>{suffix}</span>}
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Referral Code Card */}
      <div className="rounded-xl p-5" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <GiftIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-muted)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--sweet-text)' }}>{t('referrals.yourCode')}</h2>
        </div>

        {stats?.referralCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-4 py-3" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
              <p className="font-mono text-2xl font-bold tracking-widest text-center" style={{ color: 'var(--sweet-text)' }}>
                {stats.referralCode}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-xl transition-colors"
              style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}
            >
              {copied ? (
                <CheckIcon className="w-5 h-5 text-green-400" />
              ) : (
                <ClipboardTextIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-secondary)' }} />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending ? t('referrals.generating') : t('referrals.generate')}
          </button>
        )}

        <p className="text-xs mt-3 text-center" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('referrals.shareHint')}
        </p>
      </div>

      {/* Apply Code */}
      <div className="rounded-xl p-5" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
        <button
          onClick={() => setShowApply(!showApply)}
          className="w-full flex items-center justify-between text-sm font-semibold transition-colors"
          style={{ color: 'var(--sweet-text-secondary)' }}
        >
          <span>{t('referrals.applyTitle')}</span>
          <span style={{ color: 'var(--sweet-text-faint)' }}>{showApply ? '▲' : '▼'}</span>
        </button>

        {showApply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              placeholder={t('referrals.enterCode')}
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              className="sweet-input flex-1 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none transition-colors"
            />
            <button
              onClick={() => applyCode && applyMutation.mutate(applyCode)}
              disabled={applyMutation.isPending || !applyCode}
              className="px-4 py-2.5 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 text-sm"
            >
              {t('referrals.apply')}
            </button>
          </motion.div>
        )}
      </div>

      {/* Referred Partners List */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--sweet-text)' }}>{t('referrals.referredPartners')}</h2>
          <div className="space-y-3">
            {stats.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{ref.companyName}</p>
                  <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                    {t('referrals.joined')} {new Date(ref.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierColor[ref.tier] || tierColor.BRONZE}`}>
                  {ref.tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-semibold" style={{ color: 'var(--sweet-text)' }}>{t('referrals.topReferrers')}</h2>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.rank} className="flex items-center gap-3 py-2">
                <span className="w-6 text-center font-bold text-sm" style={{ color: 'var(--sweet-text-muted)' }}>
                  {entry.rank}
                </span>
                <p className="flex-1 text-sm font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>{entry.companyName}</p>
                <span className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>{entry.referralCount}</span>
                <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{t('referrals.refs')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
