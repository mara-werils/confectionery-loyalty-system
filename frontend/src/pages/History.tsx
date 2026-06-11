import { useState, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { ClockIcon, GiftIcon, DownloadSimpleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
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

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

function ClaimStatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    FULFILLED: { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' },
    PENDING:   { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' },
  };
  const fallback: React.CSSProperties = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' };
  return (
    <span
      style={{ ...(styles[status] ?? fallback), display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}
    >
      {status}
    </span>
  );
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
    <div style={{ minHeight: '100vh', padding: '24px 16px 96px', background: 'var(--sweet-bg)', color: 'var(--sweet-text)' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--sweet-text)', lineHeight: 1.15, margin: 0 }}>
            {t('history.title')}
          </h1>
          <p style={{ marginTop: 5, fontSize: 13, color: 'var(--sweet-text-secondary)', lineHeight: 1.5 }}>
            {t('history.subtitle')}
          </p>
        </div>
        {token && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid var(--sweet-border)',
              background: 'var(--sweet-card)',
              color: 'var(--sweet-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
            title="Export CSV"
          >
            <DownloadSimpleIcon style={{ width: 15, height: 15 }} />
            CSV
          </motion.button>
        )}
      </motion.div>

      {/* Search + Date Range Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <MagnifyingGlassIcon
            style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              width: 15, height: 15, color: 'var(--sweet-text-muted)', pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 16,
              paddingTop: 11,
              paddingBottom: 11,
              borderRadius: 14,
              border: '1px solid var(--sweet-border)',
              background: 'var(--sweet-input)',
              color: 'var(--sweet-text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--sweet-border)')}
          />
        </div>

        {/* Date range tab row */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DATE_RANGES.map((range) => {
            const active = dateRange === range;
            return (
              <motion.button
                key={range}
                whileTap={{ scale: 0.94 }}
                onClick={() => setDateRange(range)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  border: `1px solid ${active ? 'var(--sweet-accent)' : 'var(--sweet-border)'}`,
                  background: active ? 'var(--sweet-accent)' : 'var(--sweet-card)',
                  color: active ? '#0d0b0a' : 'var(--sweet-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t(`history.dateRange.${range}`)}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Tab.List
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
              padding: 4,
              borderRadius: 16,
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            {tabs.map((tab, tabIdx) => (
              <Tab
                key={tab.key}
                className="focus:outline-none"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '10px 8px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  ...(selectedTab === tabIdx
                    ? { background: 'var(--sweet-accent)', color: '#0d0b0a', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }
                    : { background: 'transparent', color: 'var(--sweet-text-secondary)' }),
                }}
              >
                <tab.icon style={{ width: 16, height: 16 }} />
                {tab.key === 'transactions' ? t('history.tabs.transactions') : t('history.tabs.claims')}
              </Tab>
            ))}
          </Tab.List>
        </motion.div>

        <Tab.Panels>
          {/* Transactions Panel */}
          <Tab.Panel>
            <div
              style={{
                borderRadius: 18,
                border: '1px solid var(--sweet-border)',
                background: 'var(--sweet-card)',
                overflow: 'hidden',
              }}
            >
              {isLoading ? (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 64,
                        borderRadius: 12,
                        background: 'var(--sweet-input)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                  ))}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {filteredTransactions.map((tx, index) => (
                    <motion.div key={tx.id} variants={itemVariants}>
                      <TransactionItem {...tx} partnerName={tx.partnerName} index={index} txHash={tx.txHash} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div style={{ textAlign: 'center', padding: '52px 24px' }}>
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <ClockIcon style={{ width: 28, height: 28, color: 'var(--sweet-text-faint)' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--sweet-text)', margin: 0 }}>
                    {t('history.noTransactions')}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--sweet-text-muted)', marginTop: 6 }}>
                    {t('history.noTransactionsHint')}
                  </p>
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Claims Panel */}
          <Tab.Panel>
            {historyLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 72,
                      borderRadius: 16,
                      background: 'var(--sweet-card)',
                      border: '1px solid var(--sweet-border)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            ) : filteredClaims.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <AnimatePresence>
                  {filteredClaims.map((claim) => (
                    <motion.div
                      key={claim.id}
                      variants={itemVariants}
                      layout
                      style={{
                        borderRadius: 16,
                        border: '1px solid var(--sweet-border)',
                        background: 'var(--sweet-card)',
                        padding: '14px 16px',
                        transition: 'background 0.15s',
                      }}
                      whileHover={{ background: 'var(--sweet-card-hover)' } as never}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Icon */}
                        <div
                          style={{
                            width: 44, height: 44,
                            borderRadius: 12,
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <GiftIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--sweet-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {claim.reward?.title || 'Reward'}
                          </h3>
                          <p style={{ fontSize: 12, color: 'var(--sweet-text-muted)', marginTop: 2 }}>
                            {new Date(claim.createdAt).toLocaleDateString('ru-RU', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        {/* Right */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <ClaimStatusBadge status={claim.status} />
                          <p style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--sweet-text-secondary)', marginTop: 5 }}>
                            -{Number(claim.pointsSpent).toLocaleString()} pts
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--sweet-border)',
                  background: 'var(--sweet-card)',
                  textAlign: 'center',
                  padding: '52px 24px',
                }}
              >
                <div
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--sweet-input)',
                    border: '1px solid var(--sweet-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <GiftIcon style={{ width: 28, height: 28, color: 'var(--sweet-text-faint)' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--sweet-text)', margin: 0 }}>
                  {t('history.noClaims')}
                </p>
                <p style={{ fontSize: 13, color: 'var(--sweet-text-muted)', marginTop: 6 }}>
                  {t('history.noClaimsHint')}
                </p>
              </motion.div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
