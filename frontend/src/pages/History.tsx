import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { ClockIcon, GiftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import TransactionItem from '../components/TransactionItem';
import { useTransactions, useLoyaltyHistory } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

const tabs = [
  { key: 'transactions', label: 'Transactions', icon: ClockIcon },
  { key: 'claims', label: 'Claims', icon: GiftIcon },
];

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) {
    toast.error('No data to export');
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported!');
}

export default function History() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState(0);
  const [page] = useState(1);

  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(page, 20);
  const { data: historyData, isLoading: historyLoading } = useLoyaltyHistory(page, 20);

  const transactions: {
    id: string;
    amount: string;
    pointsEarned: string;
    type: 'PURCHASE' | 'BONUS' | 'REFERRAL' | 'REDEMPTION';
    description?: string;
    partnerName?: string;
    createdAt: string;
  }[] = transactionsData?.data || [];

  const claims: {
    id: string;
    reward?: { title: string };
    pointsSpent: string;
    status: string;
    createdAt: string;
  }[] = historyData?.data || [];

  const isLoading = selectedTab === 0 ? transactionsLoading : historyLoading;

  const handleExport = () => {
    if (selectedTab === 0) {
      exportToCSV(
        transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount_kzt: tx.amount,
          points_earned: tx.pointsEarned,
          description: tx.description || '',
          date: new Date(tx.createdAt).toLocaleString(),
        })),
        'sweet_transactions.csv'
      );
    } else {
      exportToCSV(
        claims.map((c) => ({
          id: c.id,
          reward: c.reward?.title || '',
          points_spent: c.pointsSpent,
          status: c.status,
          date: new Date(c.createdAt).toLocaleString(),
        })),
        'sweet_claims.csv'
      );
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pl-1 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('history.title')}</h1>
          <p className="text-zinc-400 mt-1">{t('history.subtitle')}</p>
        </div>
        {token && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            title="Export CSV"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            CSV
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                clsx(
                  'flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 focus:outline-none',
                  selected
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10'
                )
              }
            >
              <tab.icon className="w-5 h-5" />
              {tab.key === 'transactions' ? t('history.tabs.transactions') : t('history.tabs.claims')}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* Transactions Panel */}
          <Tab.Panel>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
            >
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div>
                  {transactions.map((tx, index) => (
                    <TransactionItem key={tx.id} {...tx} partnerName={tx.partnerName} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <ClockIcon className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                  <p className="text-lg font-medium text-white">{t('history.noTransactions')}</p>
                  <p className="text-sm mt-1">{t('history.noTransactionsHint')}</p>
                </div>
              )}
            </motion.div>
          </Tab.Panel>

          {/* Claims Panel */}
          <Tab.Panel>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : claims.length > 0 ? (
                claims.map((claim, index) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                        <GiftIcon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {claim.reward?.title || 'Reward'}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-0.5">
                          {new Date(claim.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={clsx(
                            'inline-block px-2.5 py-1 rounded-full text-xs font-semibold',
                            claim.status === 'FULFILLED'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                              : claim.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              : 'bg-red-500/15 text-red-400 border border-red-500/25'
                          )}
                        >
                          {claim.status}
                        </span>
                        <p className="text-sm text-zinc-400 font-mono mt-1">
                          -{Number(claim.pointsSpent).toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl text-center py-12">
                  <GiftIcon className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                  <p className="text-lg font-medium text-white">{t('history.noClaims')}</p>
                  <p className="text-sm mt-1 text-zinc-500">{t('history.noClaimsHint')}</p>
                </div>
              )}
            </motion.div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
