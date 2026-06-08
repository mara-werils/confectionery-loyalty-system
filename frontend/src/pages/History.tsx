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
  { key: 'transactions', icon: ClockIcon },
  { key: 'claims', icon: GiftIcon },
];

type DateRange = 'today' | 'week' | 'month' | 'all';
const DATE_RANGES: DateRange[] = ['today', 'week', 'month', 'all'];

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

function exportToCSV(data: Record<string, unknown>[], filename: string, t: (key: string) => string) {
  if (!data.length) {
    toast.error(t('history.noExportData'));
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
  toast.success(t('history.csvExported'));
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
    txHash?: string;
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
        'sweet_transactions.csv',
        t
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
        'sweet_claims.csv',
        t
      );
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8 pl-1 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--sweet-text)' }}
          >
            {t('history.title')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--sweet-text-secondary)' }}>
            {t('history.subtitle')}
          </p>
        </div>
        {token && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors"
            style={{
              background: 'var(--sweet-card)',
              borderColor: 'var(--sweet-border)',
              color: 'var(--sweet-text-secondary)',
            }}
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
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--sweet-text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
            style={{
              background: 'var(--sweet-input)',
              borderColor: 'var(--sweet-border)',
              color: 'var(--sweet-text)',
            }}
          />
        </div>

        {/* Date range tab row */}
        <div className="flex gap-1.5">
          {DATE_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                dateRange === range
                  ? 'bg-white text-black'
                  : 'border'
              )}
              style={dateRange === range ? {} : {
                background: 'var(--sweet-card)',
                borderColor: 'var(--sweet-border)',
                color: 'var(--sweet-text-muted)',
              }}
            >
              {t(`history.dateRange.${range}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex gap-2 mb-6">
          {tabs.map((tab, tabIdx) => (
            <Tab
              key={tab.key}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none border"
              style={selectedTab === tabIdx
                ? { background: 'var(--sweet-accent)', borderColor: 'var(--sweet-accent)', color: 'var(--sweet-bg)' }
                : { background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)', color: 'var(--sweet-text-secondary)' }
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
                    <TransactionItem key={tx.id} {...tx} partnerName={tx.partnerName} index={index} txHash={tx.txHash} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--sweet-text-muted)' }}>
                  <ClockIcon
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  />
                  <p
                    className="text-lg font-medium"
                    style={{ color: 'var(--sweet-text)' }}
                  >
                    {t('history.noTransactions')}
                  </p>
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
                    className="rounded-2xl border p-4"
                    style={{
                      background: 'var(--sweet-card)',
                      borderColor: 'var(--sweet-border)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                        <GiftIcon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold truncate"
                          style={{ color: 'var(--sweet-text)' }}
                        >
                          {claim.reward?.title || 'Reward'}
                        </h3>
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: 'var(--sweet-text-muted)' }}
                        >
                          {new Date(claim.createdAt).toLocaleDateString('ru-RU', {
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
                        <p
                          className="text-sm font-mono mt-1"
                          style={{ color: 'var(--sweet-text-secondary)' }}
                        >
                          -{Number(claim.pointsSpent).toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="rounded-2xl border text-center py-12"
                  style={{
                    background: 'var(--sweet-card)',
                    borderColor: 'var(--sweet-border)',
                  }}
                >
                  <GiftIcon
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  />
                  <p
                    className="text-lg font-medium"
                    style={{ color: 'var(--sweet-text)' }}
                  >
                    {t('history.noClaims')}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('history.noClaimsHint')}
                  </p>
                </div>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
