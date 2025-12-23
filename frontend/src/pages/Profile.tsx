import { motion } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  WalletIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  BellIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { useAuthStore } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';

const menuItems = [
  {
    icon: ShieldCheckIcon,
    label: 'Security',
    description: 'Manage your account security',
    href: '#',
  },
  {
    icon: BellIcon,
    label: 'Notifications',
    description: 'Notification preferences',
    href: '#',
  },
  {
    icon: QuestionMarkCircleIcon,
    label: 'Help & Support',
    description: 'Get help or contact us',
    href: '#',
  },
];

export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, logout } = useAuthStore();
  const { hapticFeedback, showConfirm } = useTelegram();

  const handleDisconnect = async () => {
    hapticFeedback('medium');
    const confirmed = await showConfirm('Are you sure you want to disconnect your wallet?');
    if (confirmed) {
      await tonConnectUI.disconnect();
      logout();
      hapticFeedback('success');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-2xl font-bold text-accent-800">Profile</h1>
        <p className="text-accent-500">Manage your account</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated bg-gradient-to-br from-white to-primary-50"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-300/30">
            <UserCircleIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-accent-800">
              {user?.companyName || 'Partner Account'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold',
                  user?.tier === 'GOLD'
                    ? 'badge-gold'
                    : user?.tier === 'SILVER'
                    ? 'badge-silver'
                    : 'badge-bronze'
                )}
              >
                {user?.tier || 'BRONZE'}
              </span>
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  user?.status === 'ACTIVE'
                    ? 'bg-success-100 text-success-700'
                    : 'bg-amber-100 text-amber-700'
                )}
              >
                {user?.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Account Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card space-y-4"
      >
        <h3 className="font-bold text-accent-800">Account Details</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-primary-50 rounded-lg">
              <BuildingStorefrontIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-accent-400">Company Name</p>
              <p className="font-medium text-accent-800">
                {user?.companyName || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-primary-50 rounded-lg">
              <EnvelopeIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-accent-400">Email</p>
              <p className="font-medium text-accent-800">
                {user?.email || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-primary-50 rounded-lg">
              <WalletIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-accent-400">Wallet Address</p>
              <p className="font-medium text-accent-800 font-mono text-sm">
                {wallet ? formatAddress(wallet.account.address) : 'Not connected'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card divide-y divide-primary-50"
      >
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 py-4 first:pt-0 last:pb-0 hover:bg-primary-50/50 -mx-4 px-4 transition-colors"
          >
            <div className="p-2 bg-accent-50 rounded-lg">
              <item.icon className="w-5 h-5 text-accent-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-accent-800">{item.label}</p>
              <p className="text-xs text-accent-400">{item.description}</p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-accent-300" />
          </a>
        ))}
      </motion.div>

      {/* Disconnect Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleDisconnect}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        Disconnect Wallet
      </motion.button>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-accent-400">Sweet Loyalty v1.0.0</p>
        <p className="text-xs text-accent-300">AITU Diploma Project 2025</p>
      </div>
    </div>
  );
}




