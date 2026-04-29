import { useState, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { ClockIcon, GiftIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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

type DateRange = 'today' | 'week' | 'month' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  week: 'Week',
  month: 'Month',
  all: 'All',
};

function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

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
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');

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

  const rangeStart = getDateRangeStart(dateRange);

  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((tx) => {
      const inRange = !rangeStart || new Date(tx.createdAt) >= rangeStart;
      const matchSearch =
        !q ||
        (tx.description?.toLowerCase().includes(q) ?? false) ||
        tx.type.toLowerCase().includes(q) ||
        (tx.partnerName?.toLowerCase().includes(q) ?? false);
      return inRange && matchSearch;
    });
  }, [transactions, rangeStart, search]);

  const filteredClaims = useMemo(() => {
    const q = search.toLowerCase();
    return claims.filter((c) => {
      const inRange = !rangeStart || new Date(c.createdAt) >= rangeStart;
      const matchSearch =
        !q ||
        (c.reward?.title.toLowerCase().includes(q) ?? false) ||
        c.status.toLowerCase().includes(q);
      return inRange && matchSearch;
    });
  }, [claims, rangeStart, search]);

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
      <div className="mb-8 pl-1 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('history.title')}</h1>
          <p className="text-stone-400 mt-1">{t('history.subtitle')}</p>
        </div>
        {token && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-medium text-stone-400 hover:text-white hover:border-stone-600 transition-colors"
            title="Export CSV"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            CSV
          </button>
        )}
      </div>

      {/* Search + Date Range Filters */}
      <div className="mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by type, description…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-stone-600 transition-colors"
          />
        </div>

        {/* Date range tab row */}
        <div className="flex gap-1.5">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                dateRange === range
                  ? 'bg-white text-black'
                  : 'bg-stone-900 text-stone-500 hover:text-stone-300 border border-stone-800 hover:border-stone-700'
              )}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                clsx(
                  'flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none',
                  selected
                    ? 'bg-white text-black'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800 hover:border-stone-700'
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
            <div className="card">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div>
                  {filteredTransactions.map((tx, index) => (
                    <TransactionItem key={tx.id} {...tx} partnerName={tx.partnerName} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-stone-500">
                  <ClockIcon className="w-16 h-16 mx-auto mb-4 text-stone-700" />
                  <p className="text-lg font-medium text-white">{t('history.noTransactions')}</p>
                  <p className="text-sm mt-1">{t('history.noTransactionsHint')}</p>
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Claims Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                        <GiftIcon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {claim.reward?.title || 'Reward'}
                        </h3>
                        <p className="text-sm text-stone-500 mt-0.5">
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
                        <p className="text-sm text-stone-400 font-mono mt-1">
                          -{Number(claim.pointsSpent).toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl text-center py-12">
                  <GiftIcon className="w-16 h-16 mx-auto mb-4 text-stone-700" />
                  <p className="text-lg font-medium text-white">{t('history.noClaims')}</p>
                  <p className="text-sm mt-1 text-stone-500">{t('history.noClaimsHint')}</p>
                </div>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
