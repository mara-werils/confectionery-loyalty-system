import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardIcon,
  FunnelIcon,
  ClockIcon,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/GlassCard';

interface AuditEntry {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  ISSUE_SBT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  REVOKE_SBT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  ISSUE_COUPON: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  UPDATE_PARTNER: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  MINT_TOKENS: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  CREATE_REWARD: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  UPDATE_REWARD: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  DELETE_REWARD: 'text-red-400 bg-red-400/10 border-red-400/20',
  REDEEM_COUPON: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
  LOGIN: 'text-stone-400 bg-stone-400/10 border-stone-400/20',
  REGISTER: 'text-stone-300 bg-stone-400/10 border-stone-400/20',
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  ISSUE_SBT: 'adminDash.actions.issueSbt',
  REVOKE_SBT: 'adminDash.actions.revokeSbt',
  ISSUE_COUPON: 'adminDash.actions.issueCoupon',
  UPDATE_PARTNER: 'adminDash.actions.updatePartner',
  MINT_TOKENS: 'adminDash.actions.mintTokens',
  CREATE_REWARD: 'adminDash.actions.createReward',
  UPDATE_REWARD: 'auditLog.actions.updateReward',
  DELETE_REWARD: 'adminDash.actions.deleteReward',
  REDEEM_COUPON: 'auditLog.actions.redeemCoupon',
  LOGIN: 'auditLog.actions.login',
  REGISTER: 'auditLog.actions.register',
};

const ALL_ACTIONS = [
  'ISSUE_SBT',
  'REVOKE_SBT',
  'ISSUE_COUPON',
  'UPDATE_PARTNER',
  'MINT_TOKENS',
  'CREATE_REWARD',
  'UPDATE_REWARD',
  'DELETE_REWARD',
  'REDEEM_COUPON',
  'LOGIN',
  'REGISTER',
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, actionFilter],
    queryFn: () => api.admin.getAuditLogs({ page, limit, action: actionFilter || undefined }),
    staleTime: 15000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = data as any;
  const logs: AuditEntry[] = rawData?.data || [];
  const pagination = rawData?.pagination || { total: 0, page: 1, pages: 1 };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('auditLog.title')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('auditLog.subtitle')}</p>
      </div>

      {/* Filters */}
      <GlassCard delay={0.05} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-stone-500" />
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t('auditLog.filterByAction')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActionFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !actionFilter
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
            }`}
          >
            {t('auditLog.all')}
          </button>
          {ALL_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => { setActionFilter(action); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionFilter === action
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
              }`}
            >
              {ACTION_LABEL_KEYS[action] ? t(ACTION_LABEL_KEYS[action]) : action}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Log entries */}
      <GlassCard delay={0.1} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardIcon className="w-12 h-12 text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">{t('auditLog.noRecords')}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800/50">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        ACTION_COLORS[log.action]?.includes('text-red') ? 'border-red-400 bg-red-400/30' :
                        ACTION_COLORS[log.action]?.includes('text-amber') ? 'border-amber-400 bg-amber-400/30' :
                        'border-stone-500 bg-stone-500/30'
                      }`} />
                    </div>

                    {/* Action badge */}
                    <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded border ${
                      ACTION_COLORS[log.action] || 'text-stone-400 bg-stone-400/10 border-stone-400/20'
                    }`}>
                      {ACTION_LABEL_KEYS[log.action] ? t(ACTION_LABEL_KEYS[log.action]) : log.action.replace(/_/g, ' ')}
                    </span>

                    {/* Entity info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-300 truncate">
                        {log.entityType}
                        {log.entityId ? (
                          <span className="text-stone-500 font-mono text-xs ml-2">{log.entityId.slice(0, 16)}...</span>
                        ) : null}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-stone-500">{formatDate(log.createdAt)}</p>
                      <p className="text-[10px] text-stone-600">{formatTime(log.createdAt)}</p>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {expandedId === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-4"
                  >
                    <div className="ml-7 p-4 bg-stone-800/30 rounded-xl border border-stone-700/30 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-stone-600 uppercase tracking-wider text-[10px]">{t('auditLog.recordId')}</span>
                          <p className="text-stone-400 font-mono mt-0.5 break-all">{log.id}</p>
                        </div>
                        <div>
                          <span className="text-stone-600 uppercase tracking-wider text-[10px]">{t('auditLog.actor')}</span>
                          <p className="text-stone-400 mt-0.5">
                            <span className="text-stone-500">{log.actorType}</span>
                            {' '}<span className="font-mono">{log.actorId?.slice(0, 12)}...</span>
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-600 uppercase tracking-wider text-[10px]">{t('auditLog.entityType')}</span>
                          <p className="text-stone-400 mt-0.5">{log.entityType}</p>
                        </div>
                        <div>
                          <span className="text-stone-600 uppercase tracking-wider text-[10px]">{t('auditLog.entityId')}</span>
                          <p className="text-stone-400 font-mono mt-0.5 break-all">{log.entityId || '---'}</p>
                        </div>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="pt-2 border-t border-stone-700/30">
                          <span className="text-stone-600 uppercase tracking-wider text-[10px]">{t('auditLog.metadata')}</span>
                          <pre className="text-[11px] text-stone-400 mt-1 bg-black/30 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <ClockIcon className="w-3 h-3" />
                          <span className="text-[10px]">
                            {new Date(log.createdAt).toLocaleString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm rounded-xl bg-stone-800 border border-stone-700 text-stone-300 disabled:opacity-30 hover:border-amber-500/30 transition-colors"
          >
            {t('common.back')}
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === pageNum
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {pagination.pages > 5 && (
              <>
                <span className="text-stone-600 text-xs px-1">...</span>
                <button
                  onClick={() => setPage(pagination.pages)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === pagination.pages
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {pagination.pages}
                </button>
              </>
            )}
          </div>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm rounded-xl bg-stone-800 border border-stone-700 text-stone-300 disabled:opacity-30 hover:border-amber-500/30 transition-colors"
          >
            {t('auditLog.next')}
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="text-center">
        <p className="text-xs text-stone-600">
          {t('auditLog.totalRecords')}: {pagination.total || logs.length} · {t('auditLog.page')} {page} / {pagination.pages || 1}
        </p>
      </div>
    </div>
  );
}
