import { motion } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import { useBalance, useTransactions, useAnalyticsSummary } from '../hooks/useApi';

export default function Dashboard() {
  const wallet = useTonWallet();
  const { data: balanceData, isLoading: balanceLoading } = useBalance();
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(1, 5);
  const { data: summaryData } = useAnalyticsSummary();

  // Mock data for demo when API is not available
  const balance = balanceData?.data || {
    balance: '2500',
    lifetimeEarned: '5000',
    lifetimeRedeemed: '2500',
  };

  const tier = summaryData?.data?.tier || 'BRONZE';

  const transactions = transactionsData?.data || [
    {
      id: '1',
      amount: '150000',
      pointsEarned: '150',
      type: 'PURCHASE' as const,
      description: 'Cake order',
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
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-accent-800">Welcome back!</h1>
          <p className="text-accent-500 text-sm">
            {wallet
              ? `${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}`
              : 'Partner Dashboard'}
          </p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-300/30">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
      </motion.div>

      {/* Balance Card */}
      <BalanceCard
        balance={balance.balance}
        lifetimeEarned={balance.lifetimeEarned}
        lifetimeRedeemed={balance.lifetimeRedeemed}
        tier={tier}
        isLoading={balanceLoading}
      />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <Link
          to="/rewards"
          className="card flex items-center gap-3 p-4 hover:shadow-lg transition-shadow"
        >
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <SparklesIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-accent-800">Rewards</span>
            <p className="text-xs text-accent-400">Redeem points</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-accent-300" />
        </Link>

        <Link
          to="/history"
          className="card flex items-center gap-3 p-4 hover:shadow-lg transition-shadow"
        >
          <div className="p-2.5 bg-accent-100 rounded-xl">
            <ChartBarIcon className="w-5 h-5 text-accent-600" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-accent-800">History</span>
            <p className="text-xs text-accent-400">View all</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-accent-300" />
        </Link>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-accent-800">Recent Activity</h2>
          <Link
            to="/history"
            className="text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            View all
          </Link>
        </div>

        {transactionsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
          <div className="text-center py-8 text-accent-400">
            <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-accent-200" />
            <p>No transactions yet</p>
            <p className="text-sm">Start earning points with your first purchase!</p>
          </div>
        )}
      </motion.div>

      {/* Tier Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-gradient-to-r from-accent-50 to-primary-50"
      >
        <h2 className="font-bold text-accent-800 mb-3">Tier Progress</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-accent-500">Current: {tier}</span>
              <span className="text-primary-600 font-medium">
                {tier === 'GOLD' ? 'Max level!' : `Next: ${tier === 'BRONZE' ? 'SILVER' : 'GOLD'}`}
              </span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: tier === 'BRONZE' ? '30%' : tier === 'SILVER' ? '65%' : '100%' }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-accent-400 mt-3">
          {tier === 'GOLD'
            ? 'You have the highest tier! Enjoy 2x points on all purchases.'
            : `Earn ${tier === 'BRONZE' ? '10,000' : '50,000'} lifetime points to reach the next tier.`}
        </p>
      </motion.div>
    </div>
  );
}




