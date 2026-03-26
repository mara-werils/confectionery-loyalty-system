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
import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────
// Modal Overlay
// ─────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm font-bold px-3 py-1 rounded-lg bg-white/5">✕ Close</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toggle Switch component
// ─────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-white' : 'bg-zinc-700'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, role, setRole, logout, avatar, setAvatar, hasBusinessSbt } = useAuthStore();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeModal, setActiveModal] = useState<null | 'security' | 'notifications' | 'help'>(null);

  // Notification settings — persistent to localStorage
  const [notifPush, setNotifPush] = useState(() => localStorage.getItem('notif_push') !== 'false');
  const [notifCashback, setNotifCashback] = useState(() => localStorage.getItem('notif_cashback') !== 'false');
  const [notifRewards, setNotifRewards] = useState(() => localStorage.getItem('notif_rewards') !== 'false');
  const [notifMarketing, setNotifMarketing] = useState(() => localStorage.getItem('notif_marketing') === 'true');

  useEffect(() => { localStorage.setItem('notif_push', String(notifPush)); }, [notifPush]);
  useEffect(() => { localStorage.setItem('notif_cashback', String(notifCashback)); }, [notifCashback]);
  useEffect(() => { localStorage.setItem('notif_rewards', String(notifRewards)); }, [notifRewards]);
  useEffect(() => { localStorage.setItem('notif_marketing', String(notifMarketing)); }, [notifMarketing]);

  const menuItems = [
    {
      icon: ShieldCheckIcon,
      label: t('profile.securityTitle') || 'Security',
      description: t('profile.securityDesc') || 'Manage your account security',
      action: () => setActiveModal('security'),
    },
    {
      icon: BellIcon,
      label: t('profile.notificationsTitle') || 'Notifications',
      description: t('profile.notificationsDesc') || 'Notification preferences',
      action: () => setActiveModal('notifications'),
    },
    {
      icon: QuestionMarkCircleIcon,
      label: t('profile.helpTitle') || 'Help & Support',
      description: t('profile.helpDesc') || 'Get help or contact us',
      action: () => setActiveModal('help'),
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

      {/* ════════════════════════════════════════
          SECURITY MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'security'} onClose={() => setActiveModal(null)} title="Security">
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Connected Wallet</p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="font-mono text-sm text-zinc-200">
                {wallet ? wallet.account.address : 'Not connected'}
              </p>
            </div>
            <p className="text-xs text-zinc-600">Last active: just now</p>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Authentication Method</p>
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-white">TON Wallet Signature</p>
                <p className="text-xs text-zinc-500">Cryptographic proof — no password required</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">SBT Partner Certificate</p>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${hasBusinessSbt ? 'bg-green-400' : 'bg-red-500'}`} />
              <p className="text-sm font-semibold text-white">
                {hasBusinessSbt ? 'Valid — Bound to Wallet' : 'Not Issued'}
              </p>
            </div>
            <p className="text-xs text-zinc-500">Soulbound Token cannot be transferred or forged.</p>
          </div>

          <button
            onClick={() => { setActiveModal(null); handleDisconnect(); }}
            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            Revoke All Sessions & Disconnect
          </button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════
          NOTIFICATIONS MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="Notifications">
        <div className="space-y-3">
          {[
            { label: 'Cashback Received', subtitle: 'Notify when SWEET tokens arrive', value: notifCashback, set: setNotifCashback },
            { label: 'Reward Redeemed', subtitle: 'Confirmation after reward claim', value: notifRewards, set: setNotifRewards },
            { label: 'Push Notifications', subtitle: 'General app updates', value: notifPush, set: setNotifPush },
            { label: 'Marketing & Promotions', subtitle: 'Special offers from partners', value: notifMarketing, set: setNotifMarketing },
          ].map(({ label, subtitle, value, set }) => (
            <div key={label} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
              </div>
              <Toggle checked={value} onChange={(v) => { set(v); toast.success(`${label} ${v ? 'enabled' : 'disabled'}`, { duration: 1200 }); }} />
            </div>
          ))}
        </div>
      </Modal>

      {/* ════════════════════════════════════════
          HELP & SUPPORT MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'help'} onClose={() => setActiveModal(null)} title="Help & Support">
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Contact Us</p>
            <a
              href="https://t.me/sweetloyalty_support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.014 9.49c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.56l-2.95-.924c-.642-.204-.654-.642.136-.953l11.527-4.443c.537-.194 1.006.13.679.008z"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Telegram Support</p>
                <p className="text-xs text-zinc-500">@sweetloyalty_support</p>
              </div>
            </a>
            <a
              href="mailto:support@sweetloyalty.kz"
              className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Email Support</p>
                <p className="text-xs text-zinc-500">support@sweetloyalty.kz</p>
              </div>
            </a>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">FAQ</p>
            {[
              { q: 'How do I earn SWEET tokens?', a: 'Make purchases at partner confectioneries. 1% of every purchase is instantly converted to SWEET.' },
              { q: 'How do I redeem rewards?', a: 'Go to Rewards tab and click "Redeem" on any offer you have enough points for.' },
              { q: 'Is my wallet data safe?', a: 'Yes. We only store your public wallet address. Private keys never leave your device.' },
            ].map(({ q, a }) => (
              <details key={q} className="group cursor-pointer">
                <summary className="text-sm font-semibold text-white list-none flex justify-between items-center">
                  {q}
                  <span className="text-zinc-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
