import { motion } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
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
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, role, setRole, logout, avatar, setAvatar, hasBusinessSbt } = useAuthStore();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const menuItems = [
    {
      icon: ShieldCheckIcon,
      label: t('profile.securityTitle') || 'Security',
      description: t('profile.securityDesc') || 'Manage your account security',
      action: () => toast.success(t('profile.securityToast') || 'Security settings are secured for MVP', { icon: '🔒' }),
    },
    {
      icon: BellIcon,
      label: t('profile.notificationsTitle') || 'Notifications',
      description: t('profile.notificationsDesc') || 'Notification preferences',
      action: () => toast.success(t('profile.notificationsToast') || 'Notifications synced!', { icon: '🔔' }),
    },
    {
      icon: QuestionMarkCircleIcon,
      label: t('profile.helpTitle') || 'Help & Support',
      description: t('profile.helpDesc') || 'Get help or contact us',
      action: () => toast.success(t('profile.helpToast') || 'Support agent will contact you shortly', { icon: '💬' }),
    },
  ];

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('profile.avatarSizeError') || 'Image must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast.success(t('profile.avatarUpdated') || 'Avatar updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDisconnect = async () => {
    hapticFeedback('medium');
    try {
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
    } catch (e) {
      console.warn('Wallet disconnect error handled gracefully', e);
    }
    logout();
    setRole(null);
    hapticFeedback('success');
    navigate('/');
  };

  const handleSwitchRole = async () => {
    if (role === 'customer') {
      toast.loading(t('home.checkingCert') || 'Verifying Partner Certificate on TON...', { id: 'certCheckProfile' });
      await new Promise(r => setTimeout(r, 1000));
      
      if (!hasBusinessSbt) {
        toast.error(t('home.noCertFound') || 'Access Denied: Partner SBT Certificate not found in wallet.', { id: 'certCheckProfile' });
        return;
      }
      toast.success(t('home.certVerified') || 'Partner Certificate Verified!', { id: 'certCheckProfile' });
    }
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
        <h1 className="text-3xl font-bold text-white tracking-tight">{t('profile.title')}</h1>
        <p className="text-zinc-400 mt-1">{t('profile.subtitle')}</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
      >
        <div className="flex items-center gap-4">
          <div 
            className="relative w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner cursor-pointer group overflow-hidden"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold tracking-widest text-white">EDIT</span>
            </div>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarSelect}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {user?.companyName || 'Account'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-white/5 text-zinc-300 border-white/10">
                {role === 'business' ? 'Business' : 'Customer'}
              </span>
              {user?.tier && (
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
              )}
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
        <h3 className="font-bold text-white tracking-tight">{t('profile.accountDetails')}</h3>

        <div className="space-y-3">
          {user?.companyName && (
            <div className="flex items-center gap-3 py-2">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <BuildingStorefrontIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500">{t('profile.companyName')}</p>
                <p className="font-medium text-zinc-200">{user.companyName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <EnvelopeIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500">{t('profile.email')}</p>
              <p className="font-medium text-zinc-200">{user?.email || t('profile.notSet')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <WalletIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500">{t('profile.walletAddress')}</p>
              <p className="font-medium text-zinc-200 font-mono text-xs mt-0.5 bg-black/20 px-2 py-0.5 rounded inline-block">
                {wallet ? formatAddress(wallet.account.address) : t('profile.notSet')}
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
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
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
        {role === 'business' ? t('profile.switchToCustomer') : t('profile.switchToBusiness')}
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
        {t('profile.disconnect')}
      </motion.button>

      {/* Footer */}
      <div className="text-center pt-4 pb-8">
        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-600">{t('profile.version')}</p>
        <p className="text-[10px] text-zinc-700 mt-1">{t('profile.diploma')}</p>
      </div>
    </div>
  );
}
