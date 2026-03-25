import { useState } from 'react';
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
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { useAuthStore } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';

type SettingsTab = 'security' | 'notifications' | 'help';

const menuItems = [
  {
    icon: ShieldCheckIcon,
    label: 'Security',
    description: 'Manage your account security',
    tab: 'security' as SettingsTab,
  },
  {
    icon: BellIcon,
    label: 'Notifications',
    description: 'Notification preferences',
    tab: 'notifications' as SettingsTab,
  },
  {
    icon: QuestionMarkCircleIcon,
    label: 'Help & Support',
    description: 'Get help or contact us',
    tab: 'help' as SettingsTab,
  },
];

export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, role, setRole, logout } = useAuthStore();
  const { hapticFeedback, showConfirm } = useTelegram();
  const navigate = useNavigate();

  // Settings modal state
  const [, setIsSettingsOpen] = useState(false);
  const [, setSettingsTab] = useState<SettingsTab>('security');

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
    hapticFeedback('light');
  };

  const handleDisconnect = async () => {
    hapticFeedback('medium');
    const confirmed = await showConfirm('Are you sure you want to disconnect your wallet?');
    if (confirmed) {
      await tonConnectUI.disconnect();
      logout();
      setRole(null);
      hapticFeedback('success');
    }
  };

  const handleSwitchRole = () => {
    const newRole = role === 'business' ? 'customer' : 'business';
    setRole(newRole);
    if (newRole === 'business') {
      navigate('/business/dashboard');
    } else {
      navigate('/customer/dashboard');
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
        className="mb-4 pl-1"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">Profile</h1>
        <p className="text-zinc-400 mt-1">Manage your account settings</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
            <UserCircleIcon className="w-8 h-8 text-zinc-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {user?.companyName || 'Partner Account'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border',
                  user?.tier === 'GOLD'
                    ? 'bg-white/10 text-white border-white/20'
                    : user?.tier === 'SILVER'
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-black/40 text-zinc-400 border-white/5'
                )}
              >
                {user?.tier || 'BRONZE'}
              </span>
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border',
                  user?.status === 'ACTIVE'
                    ? 'bg-white/5 text-zinc-300 border-white/10'
                    : 'bg-black/50 text-zinc-500 border-white/5'
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
        className="glass-panel space-y-4"
      >
        <h3 className="font-bold text-white tracking-tight">Account Details</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <BuildingStorefrontIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Company Name</p>
              <p className="font-medium text-zinc-200">
                {user?.companyName || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <EnvelopeIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Email</p>
              <p className="font-medium text-zinc-200">
                {user?.email || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <WalletIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Wallet Address</p>
              <p className="font-medium text-zinc-200 font-mono text-xs mt-0.5 bg-black/20 px-2 py-0.5 rounded inline-block">
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
        className="glass-panel divide-y divide-white/5"
      >
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => openSettings(item.tab)}
            className="w-full flex items-center gap-4 py-4 first:pt-2 last:pb-2 hover:bg-white/5 -mx-6 px-6 transition-colors text-left"
          >
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <item.icon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white tracking-tight">{item.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-zinc-600" />
          </button>
        ))}
      </motion.div>

      {/* Switch Role Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handleSwitchRole}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 text-zinc-300 rounded-2xl font-bold hover:bg-white/10 border border-white/10 transition-colors"
      >
        <ArrowsRightLeftIcon className="w-5 h-5" />
        {role === 'business' ? 'Switch to Customer View' : 'Switch to Business View'}
      </motion.button>

      {/* Disconnect Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleDisconnect}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/5 text-red-500 rounded-2xl font-bold hover:bg-red-500/10 border border-red-500/10 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        Disconnect Wallet
      </motion.button>

      {/* Footer */}
      <div className="text-center pt-4 pb-8">
        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-600">Sweet Loyalty v1.0.0</p>
        <p className="text-[10px] text-zinc-700 mt-1">AITU Diploma Project 2025</p>
      </div>
    </div>
  );
}




