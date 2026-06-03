import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentPlusIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  GiftIcon,
  ArrowRightIcon,
  ClockIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/GlassCard';

const ACTION_COLORS: Record<string, string> = {
  ISSUE_SBT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  ISSUE_COUPON: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  UPDATE_PARTNER: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  MINT_TOKENS: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  CREATE_REWARD: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  DELETE_REWARD: 'text-red-400 bg-red-400/10 border-red-400/20',
  REVOKE_SBT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  ISSUE_SBT: 'adminDash.actions.issueSbt',
  ISSUE_COUPON: 'adminDash.actions.issueCoupon',
  UPDATE_PARTNER: 'adminDash.actions.updatePartner',
  MINT_TOKENS: 'adminDash.actions.mintTokens',
  CREATE_REWARD: 'adminDash.actions.createReward',
  DELETE_REWARD: 'adminDash.actions.deleteReward',
  REVOKE_SBT: 'adminDash.actions.revokeSbt',
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setHasBusinessSbt, hasBusinessSbt } = useAuthStore();

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('adminDash.justNow');
    if (mins < 60) return t('adminDash.minsAgo', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('adminDash.hoursAgo', { n: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('adminDash.daysAgo', { n: days });
    return new Date(dateStr).toLocaleDateString();
  };
  const [walletAddress, setWalletAddress] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const { data: partnersData } = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: () => api.partners.list({ page: 1, limit: 100 }),
    staleTime: 60000,
  });

  const { data: rewardsData } = useQuery({
    queryKey: ['admin', 'rewards-list'],
    queryFn: () => api.rewards.list(),
    staleTime: 60000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', 1],
    queryFn: () => api.admin.getAuditLogs({ page: 1, limit: 10 }),
    staleTime: 30000,
  });

  const { data: ecosystemData } = useQuery({
    queryKey: ['admin', 'ecosystem'],
    queryFn: () => api.partners.ecosystem(),
    staleTime: 60000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners = (partnersData as any)?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPartners = (partnersData as any)?.pagination?.total || partners.length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rewards = (rewardsData as any)?.data || (rewardsData as any) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditLogs: any[] = (auditData as any)?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ecoStats = (ecosystemData as any)?.data?.stats || {};

  const activeRewards = Array.isArray(rewards)
    ? rewards.filter((r: { isActive?: boolean }) => r.isActive !== false).length
    : 0;

  const stats = [
    { label: t('adminDash.totalPartners'), value: totalPartners, icon: BuildingStorefrontIcon, color: 'text-stone-300 bg-stone-400/10 border-stone-400/20' },
    { label: t('adminDash.transactions'), value: ecoStats.totalTransactions ?? '---', icon: ArrowsRightLeftIcon, color: 'text-stone-300 bg-stone-400/10 border-stone-400/20' },
    { label: t('adminDash.sweetIssued'), value: ecoStats.totalSweetIssued ? ecoStats.totalSweetIssued.toLocaleString() : '---', icon: CurrencyDollarIcon, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    { label: t('adminDash.activeRewards'), value: activeRewards, icon: GiftIcon, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  ];

  const quickActions = [
    { label: t('adminDash.addReward'), path: '/admin/rewards', icon: GiftIcon },
    { label: t('adminDash.partners'), path: '/admin/partners', icon: BuildingStorefrontIcon },
    { label: t('adminDash.auditLog'), path: '/admin/audit', icon: ClockIcon },
    { label: t('adminDash.settings'), path: '/admin/settings', icon: ServerIcon },
  ];

  const handleIssueSbt = async () => {
    if (!walletAddress) {
      toast.error(t('adminDash.enterWallet'));
      return;
    }
    setIsMinting(true);
    toast.loading(t('adminDash.issuingToken'), { id: 'adminMint' });
    try {
      await api.admin.issueSbt(walletAddress);
      setHasBusinessSbt(true);
      toast.success(t('adminDash.sbtIssued'), { id: 'adminMint' });
      setWalletAddress('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || t('adminDash.issueFailed'), { id: 'adminMint' });
    } finally {
      setIsMinting(false);
    }
  };

  const handleRevokeSbt = async () => {
    if (!walletAddress) {
      toast.error(t('adminDash.enterWallet'));
      return;
    }
    setIsMinting(true);
    toast.loading(t('adminDash.revokingToken'), { id: 'adminRevoke' });
    try {
      await api.admin.revokeSbt(walletAddress);
      setHasBusinessSbt(false);
      toast.success(t('adminDash.sbtRevoked'), { id: 'adminRevoke' });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || t('adminDash.revokeFailed'), { id: 'adminRevoke' });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <GlassCard key={stat.label} delay={i * 0.05} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-stone-500">{stat.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Quick Actions */}
      <GlassCard delay={0.15} className="p-5">
        <h3 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">{t('adminDash.quickActions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-800/50 border border-stone-700/50 hover:border-amber-500/30 hover:bg-stone-800 transition-all text-left group"
            >
              <action.icon className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
              <span className="text-sm text-stone-300 group-hover:text-white transition-colors">{action.label}</span>
              <ArrowRightIcon className="w-3 h-3 text-stone-600 ml-auto group-hover:text-amber-400 transition-colors" />
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SBT Management */}
        <GlassCard delay={0.2} className="p-5">
          <h3 className="text-sm font-semibold text-stone-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <DocumentPlusIcon className="w-4 h-4" />
            {t('adminDash.sbtManagement')}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
              placeholder={t('adminDash.walletPlaceholder')}
            />
            <div className="flex gap-2">
              <button
                onClick={handleIssueSbt}
                disabled={isMinting || !walletAddress}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
                {hasBusinessSbt ? <CheckCircleIcon className="w-4 h-4" /> : <DocumentPlusIcon className="w-4 h-4" />}
                {isMinting ? t('adminDash.minting') : t('adminDash.issueSbt')}
              </button>
              <button
                onClick={handleRevokeSbt}
                disabled={isMinting || !walletAddress}
                className="flex-1 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold py-2.5 rounded-xl transition-all text-sm"
              >
                {t('adminDash.revoke')}
              </button>
            </div>
          </div>
        </GlassCard>

        {/* System Health */}
        <GlassCard delay={0.25} className="p-5">
          <h3 className="text-sm font-semibold text-stone-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <ServerIcon className="w-4 h-4" />
            {t('adminDash.systemHealth')}
          </h3>
          <div className="space-y-3">
            {[
              { name: t('adminDash.svcApi'), status: 'online' },
              { name: t('adminDash.svcDb'), status: 'online' },
              { name: t('adminDash.svcTon'), status: 'online' },
              { name: t('adminDash.svcContracts'), status: 'online' },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between py-2 px-3 bg-stone-800/30 rounded-xl">
                <span className="text-sm text-stone-300">{svc.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                  <span className="text-xs text-green-400 font-medium">{t('adminDash.online')}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Activity Feed */}
      <GlassCard delay={0.3} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            {t('adminDash.recentActivity')}
          </h3>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            {t('adminDash.viewAll')} <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>
        {auditLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : auditLogs.length > 0 ? (
          <div className="space-y-2">
            {auditLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-2.5 px-3 bg-white/[0.03] rounded-xl border border-white/5"
              >
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                    ACTION_COLORS[log.action] || 'text-stone-400 bg-stone-400/10 border-stone-400/20'
                  }`}
                >
                  {ACTION_LABEL_KEYS[log.action] ? t(ACTION_LABEL_KEYS[log.action]) : log.action.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-400 truncate">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 12)}...` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-stone-600">{formatRelative(log.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-600 text-sm py-6">{t('adminDash.noRecords')}</p>
        )}
      </GlassCard>
    </div>
  );
}
