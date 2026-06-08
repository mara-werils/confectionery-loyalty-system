import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { GlassCard } from '../../components/GlassCard';

interface Partner {
  id: string;
  walletAddress: string;
  companyName: string;
  email?: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  totalTransactions?: number;
}

const TIER_STYLES: Record<string, string> = {
  BRONZE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  SILVER: 'text-stone-300 bg-stone-300/10 border-stone-300/20',
  GOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ACTIVE: 'text-green-400 bg-green-400/10 border-green-400/20',
  SUSPENDED: 'text-red-400 bg-red-400/10 border-red-400/20',
  BANNED: 'text-red-600 bg-red-600/10 border-red-600/20',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидание',
  ACTIVE: 'Активен',
  SUSPENDED: 'Приостановлен',
  BANNED: 'Заблокирован',
};

function truncateAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AdminPartners() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'partners', page, tierFilter],
    queryFn: () => api.partners.list({ page, limit: 20, tier: tierFilter || undefined }),
    staleTime: 30000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = data as any;
  const partners: Partner[] = rawData?.data || [];
  const pagination = rawData?.pagination || { total: 0, page: 1, pages: 1 };

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.admin.updatePartner(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      toast.success('Партнёр обновлён');
      setActionMenuId(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Ошибка обновления'),
  });

  const filtered = partners.filter((p) => {
    const matchSearch = !search || p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleChangeTier = (id: string, tier: string) => {
    updateMutation.mutate({ id, payload: { tier } });
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateMutation.mutate({ id, payload: { status: newStatus } });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Партнёры</h1>
        <p className="text-sm text-stone-500 mt-1">Управление бизнес-партнёрами системы лояльности</p>
      </div>

      {/* Search & Filters */}
      <GlassCard delay={0.05} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, кошельку, email..."
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <select
                value={tierFilter}
                onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
                className="bg-stone-800 border border-stone-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-stone-300 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
              >
                <option value="">Все уровни</option>
                <option value="BRONZE">Бронза</option>
                <option value="SILVER">Серебро</option>
                <option value="GOLD">Золото</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-300 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
            >
              <option value="">Все статусы</option>
              <option value="ACTIVE">Активен</option>
              <option value="PENDING">Ожидание</option>
              <option value="SUSPENDED">Приостановлен</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Partners Table */}
      <GlassCard delay={0.1} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BuildingStorefrontIcon className="w-12 h-12 text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Партнёры не найдены</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-800">
                    <th className="text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider px-6 py-3">Компания</th>
                    <th className="text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider px-4 py-3">Уровень</th>
                    <th className="text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider px-4 py-3">Статус</th>
                    <th className="text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider px-4 py-3">Кошелёк</th>
                    <th className="text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider px-4 py-3">Дата</th>
                    <th className="text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider px-6 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((partner) => (
                    <tr
                      key={partner.id}
                      className="border-b border-stone-800/50 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedPartner(partner)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-amber-400">
                              {partner.companyName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{partner.companyName}</p>
                            {partner.email && <p className="text-[11px] text-stone-500">{partner.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_STYLES[partner.tier]}`}>
                          {TIER_LABELS[partner.tier]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[partner.status]}`}>
                          {STATUS_LABELS[partner.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-xs text-stone-400 font-mono">{truncateAddress(partner.walletAddress)}</code>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-stone-500">{new Date(partner.createdAt).toLocaleDateString('ru-RU')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === partner.id ? null : partner.id)}
                            className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4 text-stone-500" />
                          </button>
                          <AnimatePresence>
                            {actionMenuId === partner.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-1 w-48 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                              >
                                <button
                                  onClick={() => { setSelectedPartner(partner); setActionMenuId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-stone-700/50 transition-colors"
                                >
                                  Подробности
                                </button>
                                <div className="border-t border-stone-700 my-1" />
                                <p className="px-4 py-1 text-[10px] text-stone-600 uppercase">Изменить уровень</p>
                                {['BRONZE', 'SILVER', 'GOLD'].map((tier) => (
                                  <button
                                    key={tier}
                                    onClick={() => handleChangeTier(partner.id, tier)}
                                    disabled={partner.tier === tier}
                                    className="w-full text-left px-4 py-1.5 text-sm text-stone-400 hover:bg-stone-700/50 disabled:opacity-30 transition-colors"
                                  >
                                    {TIER_LABELS[tier]}
                                  </button>
                                ))}
                                <div className="border-t border-stone-700 my-1" />
                                <button
                                  onClick={() => handleToggleStatus(partner.id, partner.status)}
                                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                    partner.status === 'ACTIVE'
                                      ? 'text-red-400 hover:bg-red-400/10'
                                      : 'text-green-400 hover:bg-green-400/10'
                                  }`}
                                >
                                  {partner.status === 'ACTIVE' ? 'Приостановить' : 'Активировать'}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-stone-800/50">
              {filtered.map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-amber-400">
                          {partner.companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{partner.companyName}</p>
                        <code className="text-[11px] text-stone-500 font-mono">{truncateAddress(partner.walletAddress)}</code>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_STYLES[partner.tier]}`}>
                        {TIER_LABELS[partner.tier]}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[partner.status]}`}>
                        {STATUS_LABELS[partner.status]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </GlassCard>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm rounded-xl bg-stone-800 border border-stone-700 text-stone-300 disabled:opacity-30 hover:border-amber-500/30 transition-colors"
          >
            Назад
          </button>
          <span className="text-sm text-stone-500">
            {page} / {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm rounded-xl bg-stone-800 border border-stone-700 text-stone-300 disabled:opacity-30 hover:border-amber-500/30 transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {/* Partner Detail Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPartner(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
                <h3 className="text-lg font-semibold text-white">Детали партнёра</h3>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-amber-400">
                      {selectedPartner.companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{selectedPartner.companyName}</h4>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_STYLES[selectedPartner.tier]}`}>
                        {TIER_LABELS[selectedPartner.tier]}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[selectedPartner.status]}`}>
                        {STATUS_LABELS[selectedPartner.status]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { label: 'ID', value: selectedPartner.id },
                    { label: 'Кошелёк', value: selectedPartner.walletAddress, mono: true },
                    { label: 'Email', value: selectedPartner.email || '---' },
                    { label: 'Дата регистрации', value: new Date(selectedPartner.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-start py-2 border-b border-stone-800/50">
                      <span className="text-xs text-stone-500 uppercase tracking-wider">{item.label}</span>
                      <span className={`text-sm text-stone-300 text-right max-w-[60%] break-all ${item.mono ? 'font-mono text-xs' : ''}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      handleToggleStatus(selectedPartner.id, selectedPartner.status);
                      setSelectedPartner(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedPartner.status === 'ACTIVE'
                        ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'bg-green-500 text-black hover:bg-green-400'
                    }`}
                  >
                    {selectedPartner.status === 'ACTIVE' ? 'Приостановить' : 'Активировать'}
                  </button>
                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-stone-700 text-stone-400 hover:bg-stone-800 transition-all"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
