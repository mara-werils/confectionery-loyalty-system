import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { ClockIcon, SparklesIcon, GiftIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import TransactionItem from '../components/TransactionItem';
import { useTransactions, useLoyaltyHistory } from '../hooks/useApi';

const tabs = [
  { key: 'transactions', label: 'Transactions', icon: ClockIcon },
  { key: 'claims', label: 'Claims', icon: GiftIcon },
];

export default function History() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [page, setPage] = useState(1);

  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(page, 20);
  const { data: historyData, isLoading: historyLoading } = useLoyaltyHistory(page, 20);

  // Mock data for demo
  const transactions = transactionsData?.data || [
    {
      id: '1',
      amount: '150000',
      pointsEarned: '150',
      type: 'PURCHASE' as const,
      description: 'Cake order at Sweet Bakery',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      amount: '0',
      pointsEarned: '500',
      type: 'BONUS' as const,
      description: 'Welcome bonus',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      amount: '250000',
      pointsEarned: '250',
      type: 'PURCHASE' as const,
      description: 'Wedding cake order',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: '4',
      amount: '50000',
      pointsEarned: '50',
      type: 'PURCHASE' as const,
      description: 'Pastry box',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: '5',
      amount: '0',
      pointsEarned: '200',
      type: 'REFERRAL' as const,
      description: 'Referral bonus - John Doe',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
    },
  ];

  const claims = [
    {
      id: 'c1',
      rewardTitle: '10% Discount',
      pointsSpent: '100',
      status: 'FULFILLED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'c2',
      rewardTitle: 'Free Cake Slice',
      pointsSpent: '250',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  const isLoading = selectedTab === 0 ? transactionsLoading : historyLoading;

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-accent-800">History</h1>
        <p className="text-accent-500">Your activity and claimed rewards</p>
      </motion.div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none',
                  selected
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-300/30'
                    : 'bg-white text-accent-600 hover:bg-primary-50'
                )
              }
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
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
                  {transactions.map((tx: typeof transactions[0], index: number) => (
                    <TransactionItem key={tx.id} {...tx} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-accent-400">
                  <ClockIcon className="w-16 h-16 mx-auto mb-4 text-accent-200" />
                  <p className="text-lg font-medium">No transactions yet</p>
                  <p className="text-sm">Your activity will appear here</p>
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
              {claims.length > 0 ? (
                claims.map((claim, index) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary-100 rounded-xl">
                        <GiftIcon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-accent-800">
                          {claim.rewardTitle}
                        </h3>
                        <p className="text-sm text-accent-400">
                          {new Date(claim.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={clsx(
                            'inline-block px-2.5 py-1 rounded-full text-xs font-medium',
                            claim.status === 'FULFILLED'
                              ? 'bg-success-100 text-success-700'
                              : claim.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {claim.status}
                        </span>
                        <p className="text-sm text-accent-500 mt-1">
                          -{Number(claim.pointsSpent).toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="card text-center py-12 text-accent-400">
                  <GiftIcon className="w-16 h-16 mx-auto mb-4 text-accent-200" />
                  <p className="text-lg font-medium">No claims yet</p>
                  <p className="text-sm">Redeem your points for rewards!</p>
                </div>
              )}
            </motion.div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}




