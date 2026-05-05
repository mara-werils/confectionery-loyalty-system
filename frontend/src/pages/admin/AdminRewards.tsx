import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  GiftIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { GlassCard } from '../../components/GlassCard';

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
  availableQuantity: number;
  isActive: boolean;
  createdAt: string;
}

interface RewardForm {
  title: string;
  description: string;
  pointsRequired: number;
  category: string;
  availableQuantity: number;
  isActive: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  DISCOUNT: 'text-stone-300 bg-stone-800 border-stone-700',
  PRODUCT: 'text-stone-300 bg-stone-800 border-stone-700',
  CASHBACK: 'text-stone-300 bg-stone-800 border-stone-700',
  SPECIAL: 'text-stone-300 bg-stone-800 border-stone-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  DISCOUNT: 'Скидка',
  PRODUCT: 'Продукт',
  CASHBACK: 'Кэшбэк',
  SPECIAL: 'Особое',
};

const CATEGORY_ICONS: Record<string, string> = {
  DISCOUNT: '%',
  PRODUCT: 'P',
  CASHBACK: 'C',
  SPECIAL: 'S',
};

const emptyForm: RewardForm = {
  title: '',
  description: '',
  pointsRequired: 100,
  category: 'DISCOUNT',
  availableQuantity: 10,
  isActive: true,
};

export default function AdminRewards() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'rewards', categoryFilter],
    queryFn: () => api.rewards.list({ category: categoryFilter || undefined }),
    staleTime: 30000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = data as any;
  const rewards: Reward[] = rawData?.data || (Array.isArray(rawData) ? rawData : []);

  const createMutation = useMutation({
    mutationFn: (payload: RewardForm) => api.admin.createReward({
      title: payload.title,
      description: payload.description,
      pointsRequired: payload.pointsRequired,
      category: payload.category,
      availableQuantity: payload.availableQuantity,
      isActive: payload.isActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rewards'] });
      toast.success('Награда создана');
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message || 'Ошибка создания'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RewardForm> }) =>
      api.admin.updateReward(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rewards'] });
      toast.success('Награда обновлена');
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message || 'Ошибка обновления'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rewards'] });
      toast.success('Награда удалена');
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Ошибка удаления'),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (reward: Reward) => {
    setForm({
      title: reward.title,
      description: reward.description,
      pointsRequired: reward.pointsRequired,
      category: reward.category,
      availableQuantity: reward.availableQuantity,
      isActive: reward.isActive,
    });
    setEditingId(reward.id);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Введите название награды');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Награды</h1>
          <p className="text-sm text-stone-500 mt-1">Управление наградами и бонусами</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !categoryFilter ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
          }`}
        >
          Все
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-stone-900 border border-stone-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <GiftIcon className="w-12 h-12 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Награды не найдены</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Создать первую награду
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward, i) => (
            <GlassCard key={reward.id} delay={i * 0.03} className="p-5 relative group">
              {/* Status dot */}
              <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                reward.isActive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-stone-600'
              }`} />

              {/* Category badge */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold ${CATEGORY_STYLES[reward.category]}`}>
                  {CATEGORY_ICONS[reward.category]}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CATEGORY_STYLES[reward.category]}`}>
                  {CATEGORY_LABELS[reward.category]}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1 pr-6">{reward.title}</h3>
              <p className="text-xs text-stone-500 line-clamp-2 mb-3">{reward.description}</p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">{reward.pointsRequired}</span>
                  <span className="text-[10px] text-stone-500">баллов</span>
                </div>
                <span className="text-[11px] text-stone-500">
                  Кол-во: {reward.availableQuantity}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(reward); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:border-amber-500/30 hover:text-amber-400 transition-all text-xs"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  Изменить
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(reward.id); }}
                  className="flex items-center justify-center px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-500 hover:border-red-500/30 hover:text-red-400 transition-all"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
                <h3 className="text-lg font-semibold text-white">
                  {editingId ? 'Редактирование награды' : 'Новая награда'}
                </h3>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors">
                  <XMarkIcon className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Название</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Скидка 10% на торты"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Описание</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                    placeholder="Подробное описание награды..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Баллы</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.pointsRequired}
                      onChange={(e) => setForm({ ...form, pointsRequired: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Кол-во</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.availableQuantity}
                      onChange={(e) => setForm({ ...form, availableQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-300 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-stone-300">Активна</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-amber-500' : 'bg-stone-700'}`}
                  >
                    <motion.div
                      animate={{ x: form.isActive ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                    />
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl transition-all text-sm"
                  >
                    {isSaving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium border border-stone-700 text-stone-400 hover:bg-stone-800 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Удалить награду?</h3>
              <p className="text-sm text-stone-400 mb-6">Это действие нельзя отменить. Награда будет удалена навсегда.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                >
                  {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-stone-700 text-stone-400 hover:bg-stone-800 transition-all"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
