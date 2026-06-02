import { motion, AnimatePresence } from 'framer-motion';
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
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  TrophyIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useBalance, useLoyaltyHistory } from '../hooks/useApi';

const safeStorageGet = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted webviews.
  }
};

// ─── Modal ───────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl p-6 pb-24 space-y-5 border"
          style={{
            background: 'var(--sweet-card)',
            borderColor: 'var(--sweet-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: 'var(--sweet-text)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="transition-colors text-sm font-bold px-3 py-1 rounded-lg bg-white/5"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--sweet-text)' : 'var(--sweet-card-hover)' }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        style={{ background: 'var(--sweet-card)' }}
      />
    </button>
  );
}

// ─── Tier badge inline styles ─────────────────────────────────────
const TIER_INLINE_STYLES: Record<string, React.CSSProperties> = {
  GOLD: { background: 'rgba(234,179,8,0.1)', color: '#facc15', borderColor: 'rgba(234,179,8,0.3)' },
  SILVER: { background: 'var(--sweet-card-hover)', color: 'var(--sweet-text-secondary)', borderColor: 'var(--sweet-border)' },
  BRONZE: { background: 'rgba(249,115,22,0.1)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' },
};

const TIER_NEXT: Record<string, { next: string; required: number }> = {
  BRONZE: { next: 'SILVER', required: 5000 },
  SILVER: { next: 'GOLD', required: 20000 },
  GOLD: { next: 'MAX', required: 0 },
};

export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const {
    user,
    role,
    setRole,
    logout,
    avatar,
    setAvatar,
    hasBusinessSbt,
    setHasBusinessSbt,
    setUser,
    setToken,
    sweetBalance,
    token,
  } = useAuthStore();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeModal, setActiveModal] = useState<null | 'security' | 'notifications' | 'help' | 'edit'>(null);

  // Edit profile state
  const [editName, setEditName] = useState(user?.companyName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  // Notification settings
  const [notifPush, setNotifPush] = useState(() => safeStorageGet('notif_push') !== 'false');
  const [notifCashback, setNotifCashback] = useState(() => safeStorageGet('notif_cashback') !== 'false');
  const [notifRewards, setNotifRewards] = useState(() => safeStorageGet('notif_rewards') !== 'false');
  const [notifMarketing, setNotifMarketing] = useState(() => safeStorageGet('notif_marketing') === 'true');

  useEffect(() => { safeStorageSet('notif_push', String(notifPush)); }, [notifPush]);
  useEffect(() => { safeStorageSet('notif_cashback', String(notifCashback)); }, [notifCashback]);
  useEffect(() => { safeStorageSet('notif_rewards', String(notifRewards)); }, [notifRewards]);
  useEffect(() => { safeStorageSet('notif_marketing', String(notifMarketing)); }, [notifMarketing]);

  // Real balance + recent activity
  const { data: balanceData } = useBalance();
  const { data: historyData } = useLoyaltyHistory(1, 3);

  const balance = Number(balanceData?.data?.balance || sweetBalance || 0);
  const lifetimeEarned = Number(balanceData?.data?.lifetimeEarned || 0);
  const recentTxs: { id: string; type: string; pointsEarned: string; description?: string; createdAt: string }[] =
    historyData?.data || [];

  // Tier progress
  const tier = user?.tier || 'BRONZE';
  const tierInfo = TIER_NEXT[tier];
  const progress = tier === 'GOLD' ? 100 : Math.min(100, Math.round((lifetimeEarned / tierInfo.required) * 100));

  // Wallet address copy
  const [copied, setCopied] = useState(false);
  const handleCopyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.account.address);
    setCopied(true);
    toast.success('Address copied!', { duration: 1500 });
    setTimeout(() => setCopied(false), 2000);
  };

  // Save profile edit
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const res = await api.partners.update(user.id, {
        companyName: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
      }) as { data: { companyName: string; email: string } };
      setUser({ ...user, companyName: res.data.companyName, email: res.data.email });
      toast.success('Profile updated!');
      setActiveModal(null);
    } catch {
      toast.error('Failed to update profile');
    }
    setIsSaving(false);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) { toast.error('Image must be under 512KB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result as string); toast.success('Avatar updated!'); };
    reader.readAsDataURL(file);
  };

  const handleDisconnect = async () => {
    hapticFeedback('medium');
    try { if (tonConnectUI.connected) await tonConnectUI.disconnect(); } catch { /* handled */ }
    logout();
    setRole(null);
    hapticFeedback('success');
    navigate('/');
  };

  const handleSwitchRole = async () => {
    if (role === 'customer') {
      // If SBT was already verified in this session, skip the API call
      if (!hasBusinessSbt) {
        const address = wallet?.account?.address;
        if (!address) {
          toast.error('Wallet not connected');
          return;
        }
        toast.loading('Verifying Partner Certificate on TON...', { id: 'certCheck' });
        try {
          await new Promise(r => setTimeout(r, 800));
          const res = await api.admin.checkSbt(address) as { data: { hasSbt: boolean } };
          if (!res.data?.hasSbt) {
            toast.error('No Partner SBT found. Ask admin to issue one at /admin.', { id: 'certCheck' });
            return;
          }
          setHasBusinessSbt(true);
          toast.success('Partner Certificate Verified!', { id: 'certCheck' });
        } catch {
          toast.error('Verification failed — is the backend running?', { id: 'certCheck' });
          return;
        }
      }
    }
    const newRole = role === 'business' ? 'customer' : 'business';
    if (newRole === 'business') {
      // Check server-side if already registered as business
      const existingToken = useAuthStore.getState().token;
      if (existingToken) {
        try {
          const meRes = await api.auth.me() as { data?: { partner?: { id: string; walletAddress: string; companyName: string; email?: string; tier: 'BRONZE' | 'SILVER' | 'GOLD'; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' } } };
          const partner = meRes?.data?.partner;
          if (partner && !partner.companyName?.startsWith('Customer_')) {
            setUser(partner);
            setRole('business');
            navigate('/business/dashboard');
            return;
          }
        } catch {
          // token invalid — fall through to register
        }
      }
      setRole('business');
      navigate('/business/register');
    } else {
      // Re-auth as customer to avoid stale/invalid session after role switch
      const address = wallet?.account?.address;
      if (address) {
        try {
          const res = await api.auth.customerAuth(address) as {
            data?: {
              token?: string;
              partner?: {
                id: string;
                walletAddress: string;
                companyName: string;
                email?: string;
                tier: 'BRONZE' | 'SILVER' | 'GOLD';
                status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
              };
            };
          };
          if (res.data?.token) setToken(res.data.token);
          if (res.data?.partner) setUser(res.data.partner);
        } catch {
          // Non-fatal: keep navigation, dashboard has its own fallbacks
        }
      }
      setRole('customer');
      navigate('/customer/dashboard');
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const menuItems = [
    { icon: PencilIcon, label: 'Edit Profile', description: 'Update name and email', action: () => { setEditName(user?.companyName || ''); setEditEmail(user?.email || ''); setActiveModal('edit'); } },
    { icon: ShieldCheckIcon, label: t('profile.securityTitle') || 'Security', description: t('profile.securityDesc') || 'Wallet & SBT certificate', action: () => setActiveModal('security') },
    { icon: BellIcon, label: t('profile.notificationsTitle') || 'Notifications', description: t('profile.notificationsDesc') || 'Notification preferences', action: () => setActiveModal('notifications') },
    { icon: QuestionMarkCircleIcon, label: t('profile.helpTitle') || 'Help & Support', description: t('profile.helpDesc') || 'FAQ and contacts', action: () => setActiveModal('help') },
  ];

  return (
    <div className="px-4 py-6 space-y-5 pb-32">

      {/* Header */}
      <div className="pl-1">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>{t('profile.title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--sweet-text-muted)' }}>{t('profile.subtitle')}</p>
      </div>

      {/* Profile Card */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center cursor-pointer group overflow-hidden shrink-0 border"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {avatar
              ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              : <UserCircleIcon className="w-9 h-9 group-hover:opacity-80 transition-opacity" style={{ color: 'var(--sweet-text-muted)' }} />
            }
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PencilIcon className="w-5 h-5 text-white" />
            </div>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold tracking-tight truncate" style={{ color: 'var(--sweet-text)' }}>
              {user?.companyName || 'My Account'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                style={{
                  background: 'var(--sweet-card-hover)',
                  color: 'var(--sweet-text-secondary)',
                  borderColor: 'var(--sweet-border)',
                }}
              >
                {role === 'business' ? 'Business' : 'Customer'}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                style={TIER_INLINE_STYLES[tier]}
              >
                {tier}
              </span>
              {user?.status === 'ACTIVE' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-green-500/10 text-green-400 border-green-500/20">
                  Active
                </span>
              )}
            </div>
            {user?.email && (
              <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--sweet-text-muted)' }}>{user.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Balance', value: balance.toLocaleString(), sub: 'SWEET', icon: SparklesIcon },
          { label: 'Lifetime', value: lifetimeEarned.toLocaleString(), sub: 'earned', icon: TrophyIcon },
          { label: 'Coupons', value: useAuthStore.getState().activeCoupons.length, sub: 'active', icon: ClockIcon },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center border"
            style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
          >
            <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--sweet-text-muted)' }} />
            <p className="text-lg font-bold leading-tight" style={{ color: 'var(--sweet-text)' }}>{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
            <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tier Progress */}
      {tier !== 'GOLD' && (
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>Progress to {tierInfo.next}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--sweet-text-secondary)' }}>{lifetimeEarned.toLocaleString()} / {tierInfo.required.toLocaleString()}</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--sweet-card-hover)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              className={clsx('h-full rounded-full', tier === 'BRONZE' ? 'bg-orange-400' : 'bg-stone-300')}
            />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--sweet-text-faint)' }}>{progress}% — {(tierInfo.required - lifetimeEarned).toLocaleString()} SWEET to reach {tierInfo.next}</p>
        </div>
      )}

      {/* Wallet Address */}
      {wallet && (
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
        >
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--sweet-text-muted)' }}>TON Wallet</p>
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl border"
              style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
            >
              <WalletIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
            </div>
            <p className="flex-1 font-mono text-xs truncate" style={{ color: 'var(--sweet-text-secondary)' }}>{formatAddress(wallet.account.address)}</p>
            <button onClick={handleCopyAddress} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>Connected · TON Testnet</p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {token && recentTxs.length > 0 && (
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
        >
          <p className="text-xs mb-3 font-medium" style={{ color: 'var(--sweet-text-muted)' }}>Recent Activity</p>
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-1.5 h-1.5 rounded-full', tx.type === 'PURCHASE' ? 'bg-green-400' : tx.type === 'REFERRAL' ? 'bg-amber-400' : 'bg-stone-500')} />
                  <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--sweet-text-secondary)' }}>{tx.description || tx.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-green-400">+{Number(tx.pointsEarned).toLocaleString()}</p>
                  <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>{timeAgo(tx.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
      >
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 transition-colors text-left border-b last:border-0"
            style={{ borderColor: 'var(--sweet-border)' }}
          >
            <div
              className="p-2 rounded-xl border shrink-0"
              style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
            >
              <item.icon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{item.description}</p>
            </div>
            <ChevronRightIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--sweet-text-faint)' }} />
          </button>
        ))}
      </div>

      {/* Switch Role */}
      <button
        onClick={handleSwitchRole}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-colors text-sm border hover:opacity-80"
        style={{
          background: 'var(--sweet-card)',
          color: 'var(--sweet-text-secondary)',
          borderColor: 'var(--sweet-border)',
        }}
      >
        <ArrowsRightLeftIcon className="w-5 h-5" />
        {role === 'business' ? t('profile.switchToCustomer') : t('profile.switchToBusiness')}
      </button>

      {/* Disconnect */}
      <button
        onClick={handleDisconnect}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/5 text-red-500 rounded-2xl font-bold hover:bg-red-500/10 border border-red-500/20 transition-colors text-sm"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        {t('profile.disconnect')}
      </button>

      {/* Footer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--sweet-text-faint)' }}>{t('profile.version')}</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--sweet-text-faint)' }}>{t('profile.diploma')}</p>
      </div>

      {/* ══════════════════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════════════════ */}
      <Modal open={activeModal === 'edit'} onClose={() => setActiveModal(null)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--sweet-text-secondary)' }}>
              <BuildingStorefrontIcon className="w-3.5 h-3.5 inline mr-1" />
              Company / Display Name
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your company name"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors border"
              style={{
                background: 'var(--sweet-input)',
                borderColor: 'var(--sweet-border)',
                color: 'var(--sweet-text)',
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--sweet-text-secondary)' }}>
              <EnvelopeIcon className="w-3.5 h-3.5 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors border"
              style={{
                background: 'var(--sweet-input)',
                borderColor: 'var(--sweet-border)',
                color: 'var(--sweet-text)',
              }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors border"
              style={{
                background: 'var(--sweet-card-hover)',
                color: 'var(--sweet-text-secondary)',
                borderColor: 'var(--sweet-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || (!editName.trim() && !editEmail.trim())}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
              ) : (
                <><CheckIcon className="w-4 h-4" /> Save</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          SECURITY MODAL
      ══════════════════════════════════════════ */}
      <Modal open={activeModal === 'security'} onClose={() => setActiveModal(null)} title="Security">
        <div className="space-y-4">
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-secondary)' }}>Connected Wallet</p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <p className="font-mono text-xs break-all" style={{ color: 'var(--sweet-text-secondary)' }}>
                {wallet ? wallet.account.address : 'Not connected'}
              </p>
            </div>
            {wallet && (
              <button
                onClick={handleCopyAddress}
                className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: 'var(--sweet-text-muted)' }}
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy full address'}
              </button>
            )}
          </div>

          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-secondary)' }}>Authentication</p>
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>TON Wallet Signature</p>
                <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Cryptographic proof — no password stored</p>
              </div>
            </div>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-secondary)' }}>SBT Partner Certificate</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${hasBusinessSbt ? 'bg-green-400' : 'bg-stone-600'}`} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
                    {hasBusinessSbt ? 'Valid — Bound to Wallet' : 'Not Issued'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Soulbound Token — non-transferable</p>
                </div>
              </div>
              {hasBusinessSbt && (
                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                  ACTIVE
                </span>
              )}
            </div>
          </div>

          <div
            className="p-4 rounded-2xl border"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--sweet-text-secondary)' }}>Account Status</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p style={{ color: 'var(--sweet-text-faint)' }}>Tier</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--sweet-text)' }}>{tier}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sweet-text-faint)' }}>Status</p>
                <p className="font-bold text-green-400 mt-0.5">{user?.status || 'ACTIVE'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sweet-text-faint)' }}>Balance</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--sweet-text)' }}>{balance.toLocaleString()} SWEET</p>
              </div>
              <div>
                <p style={{ color: 'var(--sweet-text-faint)' }}>Network</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--sweet-text)' }}>TON Testnet</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setActiveModal(null); handleDisconnect(); }}
            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            Revoke All Sessions & Disconnect
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          NOTIFICATIONS MODAL
      ══════════════════════════════════════════ */}
      <Modal open={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="Notifications">
        <div className="space-y-3">
          {[
            { label: 'Cashback Received', subtitle: 'When SWEET tokens arrive in your wallet', value: notifCashback, set: setNotifCashback },
            { label: 'Reward Redeemed', subtitle: 'Confirmation after a successful claim', value: notifRewards, set: setNotifRewards },
            { label: 'Push Notifications', subtitle: 'General app and system updates', value: notifPush, set: setNotifPush },
            { label: 'Marketing & Offers', subtitle: 'Special deals from partner confectioneries', value: notifMarketing, set: setNotifMarketing },
          ].map(({ label, subtitle, value, set }) => (
            <div
              key={label}
              className="flex items-center justify-between p-4 rounded-2xl border"
              style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
            >
              <div className="mr-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{subtitle}</p>
              </div>
              <Toggle checked={value} onChange={(v) => { set(v); toast.success(`${label} ${v ? 'on' : 'off'}`, { duration: 1000 }); }} />
            </div>
          ))}
          <p className="text-xs text-center pt-1" style={{ color: 'var(--sweet-text-faint)' }}>Settings are saved locally on this device</p>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          HELP & SUPPORT MODAL
      ══════════════════════════════════════════ */}
      <Modal open={activeModal === 'help'} onClose={() => setActiveModal(null)} title="Help & Support">
        <div className="space-y-4">
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-secondary)' }}>Contact</p>
            <a href="https://t.me/marlenqq" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.014 9.49c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.56l-2.95-.924c-.642-.204-.654-.642.136-.953l11.527-4.443c.537-.194 1.006.13.679.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>Telegram Support</p>
                <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>@marlenqq</p>
              </div>
            </a>
            <a href="mailto:support@sweetloyalty.kz"
              className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
                style={{ background: 'var(--sweet-card)', borderColor: 'var(--sweet-border)' }}
              >
                <EnvelopeIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>Email Support</p>
                <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>support@sweetloyalty.kz</p>
              </div>
            </a>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--sweet-card-hover)', borderColor: 'var(--sweet-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-secondary)' }}>FAQ</p>
            {[
              { q: 'How do I earn SWEET tokens?', a: 'Every purchase at a partner confectionery earns you SWEET tokens. 10% of the purchase amount is converted instantly.' },
              { q: 'How do I redeem rewards?', a: 'Go to the Rewards section, choose an offer, and tap Redeem. A coupon code is generated immediately.' },
              { q: 'What is a tier system?', a: 'Bronze → Silver → Gold. Higher tiers earn more tokens per purchase (1x, 1.5x, 2x multiplier).' },
              { q: 'Is my wallet data safe?', a: 'Yes. We only store your public wallet address. Your private keys never leave your device.' },
              { q: 'What is an SBT Certificate?', a: 'A Soulbound Token proves you are a verified partner. It is bound to your wallet and cannot be transferred.' },
            ].map(({ q, a }) => (
              <details key={q} className="group cursor-pointer">
                <summary className="text-sm font-semibold list-none flex justify-between items-center gap-2" style={{ color: 'var(--sweet-text)' }}>
                  <span>{q}</span>
                  <span className="group-open:rotate-180 transition-transform shrink-0" style={{ color: 'var(--sweet-text-muted)' }}>▾</span>
                </summary>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--sweet-text-secondary)' }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
