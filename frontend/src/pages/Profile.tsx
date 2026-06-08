import { motion, AnimatePresence } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import {
  UserCircleIcon,
  StorefrontIcon,
  EnvelopeIcon,
  WalletIcon,
  SignOutIcon,
  CaretRightIcon,
  ShieldCheckIcon,
  BellIcon,
  QuestionIcon,
  ArrowsLeftRightIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ClipboardTextIcon,
  SparkleIcon,
  TrophyIcon,
  ClockIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useBalance, useLoyaltyHistory } from '../hooks/useApi';

const safeStorageGet = (key: string) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const safeStorageSet = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch { /* restricted webview */ }
};

// ─── Modal ───────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-[28px] p-6 pb-24 space-y-5"
          style={{
            background: 'var(--sweet-card)',
            borderTop: '1px solid var(--sweet-border)',
            borderLeft: '1px solid var(--sweet-border)',
            borderRight: '1px solid var(--sweet-border)',
          }}
        >
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--sweet-border)', color: 'var(--sweet-text-muted)' }}
            >
              <XIcon className="w-4 h-4" />
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
      className="relative inline-flex h-[26px] w-[46px] items-center rounded-full transition-all duration-200"
      style={{ background: checked ? 'var(--sweet-accent, #f59e0b)' : 'var(--sweet-border)' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute inline-block h-[20px] w-[20px] rounded-full shadow-sm"
        style={{
          background: 'var(--sweet-card)',
          left: checked ? 'calc(100% - 23px)' : '3px',
        }}
      />
    </button>
  );
}

// ─── Tier config ──────────────────────────────────────────────────
const TIER_INLINE_STYLES: Record<string, React.CSSProperties> = {
  GOLD:   { background: 'rgba(234,179,8,0.12)', color: '#f59e0b', borderColor: 'rgba(234,179,8,0.35)' },
  SILVER: { background: 'var(--sweet-card-hover)', color: 'var(--sweet-text-secondary)', borderColor: 'var(--sweet-border)' },
  BRONZE: { background: 'rgba(249,115,22,0.1)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' },
};

const TIER_BAR_COLOR: Record<string, string> = {
  GOLD: '#f59e0b', SILVER: '#a8a29e', BRONZE: '#fb923c',
};

const TIER_NEXT: Record<string, { next: string; required: number }> = {
  BRONZE: { next: 'SILVER', required: 5000 },
  SILVER: { next: 'GOLD', required: 20000 },
  GOLD:   { next: 'MAX', required: 0 },
};

// ─── Section label ────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2" style={{ color: 'var(--sweet-text-faint)' }}>
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function Profile() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const {
    user, role, setRole, logout, avatar, setAvatar,
    hasBusinessSbt, setHasBusinessSbt, setUser, setToken, sweetBalance, token,
  } = useAuthStore();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeModal, setActiveModal] = useState<null | 'security' | 'notifications' | 'help' | 'edit'>(null);
  const [editName, setEditName] = useState(user?.companyName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const [notifPush, setNotifPush]           = useState(() => safeStorageGet('notif_push') !== 'false');
  const [notifCashback, setNotifCashback]   = useState(() => safeStorageGet('notif_cashback') !== 'false');
  const [notifRewards, setNotifRewards]     = useState(() => safeStorageGet('notif_rewards') !== 'false');
  const [notifMarketing, setNotifMarketing] = useState(() => safeStorageGet('notif_marketing') === 'true');

  useEffect(() => { safeStorageSet('notif_push',      String(notifPush));      }, [notifPush]);
  useEffect(() => { safeStorageSet('notif_cashback',  String(notifCashback));  }, [notifCashback]);
  useEffect(() => { safeStorageSet('notif_rewards',   String(notifRewards));   }, [notifRewards]);
  useEffect(() => { safeStorageSet('notif_marketing', String(notifMarketing)); }, [notifMarketing]);

  const { data: balanceData } = useBalance();
  const { data: historyData } = useLoyaltyHistory(1, 3);

  const apiBalance    = Number(balanceData?.data?.balance || 0);
  const balance       = sweetBalance > 0 ? sweetBalance : apiBalance;
  const lifetimeEarned = Number(balanceData?.data?.lifetimeEarned || 0);
  const recentTxs: { id: string; type: string; pointsEarned: string; description?: string; createdAt: string }[] =
    historyData?.data || [];

  const dbTier    = user?.tier || 'BRONZE';
  const balanceTier = balance >= 20000 ? 'GOLD' : balance >= 5000 ? 'SILVER' : 'BRONZE';
  const tierOrder = ['BRONZE', 'SILVER', 'GOLD'];
  const tier      = tierOrder.indexOf(balanceTier) > tierOrder.indexOf(dbTier) ? balanceTier : dbTier;
  const tierInfo  = TIER_NEXT[tier];
  const remaining = Math.max(0, tierInfo.required - balance);
  const progress  = tier === 'GOLD' ? 100 : Math.min(100, Math.round((balance / tierInfo.required) * 100));

  const [copied, setCopied] = useState(false);
  const handleCopyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.account.address);
    setCopied(true);
    toast.success('Address copied!', { duration: 1500 });
    setTimeout(() => setCopied(false), 2000);
  };

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
    } catch { toast.error('Failed to update profile'); }
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
    logout(); setRole(null); hapticFeedback('success'); navigate('/');
  };

  const handleSwitchRole = async () => {
    if (role === 'customer') {
      if (!hasBusinessSbt) {
        const address = wallet?.account?.address;
        if (!address) { toast.error('Wallet not connected'); return; }
        toast.loading('Verifying Partner Certificate on TON...', { id: 'certCheck' });
        try {
          await new Promise(r => setTimeout(r, 800));
          const res = await api.admin.checkSbt(address) as { data: { hasSbt: boolean } };
          if (!res.data?.hasSbt) { toast.error('No Partner SBT found. Ask admin to issue one at /admin.', { id: 'certCheck' }); return; }
          setHasBusinessSbt(true);
          toast.success('Partner Certificate Verified!', { id: 'certCheck' });
        } catch { toast.error('Verification failed — is the backend running?', { id: 'certCheck' }); return; }
      }
    }
    const newRole = role === 'business' ? 'customer' : 'business';
    if (newRole === 'business') {
      const existingToken = useAuthStore.getState().token;
      if (existingToken) {
        try {
          const meRes = await api.auth.me() as { data?: { partner?: { id: string; walletAddress: string; companyName: string; email?: string; tier: 'BRONZE' | 'SILVER' | 'GOLD'; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' } } };
          const partner = meRes?.data?.partner;
          if (partner && !partner.companyName?.startsWith('Customer_')) {
            setUser(partner); setRole('business'); navigate('/business/dashboard'); return;
          }
        } catch { /* fall through */ }
      }
      setRole('business'); navigate('/business/register');
    } else {
      const address = wallet?.account?.address;
      if (address) {
        try {
          const res = await api.auth.customerAuth(address) as { data?: { token?: string; partner?: { id: string; walletAddress: string; companyName: string; email?: string; tier: 'BRONZE' | 'SILVER' | 'GOLD'; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' } } };
          if (res.data?.token) setToken(res.data.token);
          if (res.data?.partner) setUser(res.data.partner);
        } catch { /* non-fatal */ }
      }
      setRole('customer'); navigate('/customer/dashboard');
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 8)}…${addr.slice(-6)}`;
  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const menuItems = [
    { icon: PencilIcon,             label: t('profile.editProfile'),               description: 'Update name and email',         action: () => { setEditName(user?.companyName || ''); setEditEmail(user?.email || ''); setActiveModal('edit'); } },
    { icon: ShieldCheckIcon,        label: t('profile.securityTitle') || 'Security',       description: t('profile.securityDesc') || 'Wallet & SBT certificate',   action: () => setActiveModal('security') },
    { icon: BellIcon,               label: t('profile.notificationsTitle') || 'Notifications', description: t('profile.notificationsDesc') || 'Notification preferences', action: () => setActiveModal('notifications') },
    { icon: QuestionIcon, label: t('profile.helpTitle') || 'Help & Support',    description: t('profile.helpDesc') || 'FAQ and contacts',             action: () => setActiveModal('help') },
  ];

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--sweet-bg)' }}>
      <motion.div
        className="px-4 py-6 space-y-5 max-w-[430px] mx-auto"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >

        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between px-1 pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>
              {t('profile.title')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
              {t('profile.subtitle')}
            </p>
          </div>
          {user?.status === 'ACTIVE' && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          )}
        </motion.div>

        {/* ── Hero Profile Card ── */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-3xl overflow-hidden p-5"
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
          }}
        >
          {/* Subtle ambient glow top-right */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(245,158,11,0.07)', filter: 'blur(30px)' }}
          />

          <div className="flex items-start gap-4 relative">
            {/* Avatar */}
            <div
              className="relative w-[68px] h-[68px] rounded-2xl flex items-center justify-center cursor-pointer group overflow-hidden shrink-0"
              style={{ background: 'var(--sweet-input)', border: '1.5px solid var(--sweet-border)' }}
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              {avatar
                ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                : <UserCircleIcon className="w-8 h-8" style={{ color: 'var(--sweet-text-faint)' }} />
              }
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <PencilIcon className="w-4 h-4 text-white" />
              </div>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate leading-snug" style={{ color: 'var(--sweet-text)' }}>
                {user?.companyName || 'My Account'}
              </h2>
              {user?.email && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--sweet-text-muted)' }}>{user.email}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border"
                  style={{ background: 'var(--sweet-input)', color: 'var(--sweet-text-secondary)', borderColor: 'var(--sweet-border)' }}
                >
                  {role === 'business' ? 'Business' : 'Customer'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border"
                  style={TIER_INLINE_STYLES[tier]}
                >
                  {tier}
                </span>
              </div>
            </div>
          </div>

          {/* Tier progress — inlined in hero card */}
          {tier !== 'GOLD' && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--sweet-border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--sweet-text-muted)' }}>
                  Progress to {tierInfo.next}
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--sweet-text-faint)' }}>
                  {lifetimeEarned.toLocaleString()} / {tierInfo.required.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sweet-input)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: TIER_BAR_COLOR[tier] }}
                />
              </div>
              <p className="text-[9px] mt-1" style={{ color: 'var(--sweet-text-faint)' }}>
                {progress}% — {remaining > 0 ? `${remaining.toLocaleString()} SWEET to ${tierInfo.next}` : `Ready for ${tierInfo.next}!`}
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Stats Row ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Balance',  value: balance.toLocaleString(),          sub: 'SWEET',  icon: SparkleIcon, accent: true },
            { label: 'Lifetime', value: lifetimeEarned.toLocaleString(),   sub: 'earned', icon: TrophyIcon,   accent: false },
            { label: 'Coupons',  value: useAuthStore.getState().activeCoupons.length, sub: 'active', icon: ClockIcon, accent: false },
          ].map(({ label, value, sub, icon: Icon, accent }, i) => (
            <motion.div
              key={label}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl p-3 flex flex-col items-center text-center relative overflow-hidden"
              style={{
                background: 'var(--sweet-card)',
                border: `1px solid ${accent ? 'rgba(245,158,11,0.25)' : 'var(--sweet-border)'}`,
              }}
            >
              {accent && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
              )}
              <Icon
                className="w-3.5 h-3.5 mb-1.5"
                style={{ color: accent ? '#f59e0b' : 'var(--sweet-text-faint)' }}
              />
              <p className="text-sm font-bold leading-none" style={{ color: accent ? '#f59e0b' : 'var(--sweet-text)' }}>
                {value}
              </p>
              <p className="text-[9px] mt-1 font-medium" style={{ color: 'var(--sweet-text-faint)' }}>
                {label}
              </p>
              <p className="text-[8px]" style={{ color: 'var(--sweet-text-faint)' }}>{sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Wallet ── */}
        {wallet && (
          <motion.div variants={fadeUp}>
            <SectionLabel>Wallet</SectionLabel>
            <div
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="p-2 rounded-xl shrink-0" style={{ background: 'var(--sweet-input)' }}>
                <WalletIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-medium truncate" style={{ color: 'var(--sweet-text-secondary)' }}>
                  {formatAddress(wallet.account.address)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>TON Testnet · Connected</p>
                </div>
              </div>
              <button onClick={handleCopyAddress} className="p-2 rounded-xl transition-colors hover:opacity-70 shrink-0"
                style={{ background: 'var(--sweet-input)' }}>
                {copied
                  ? <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                  : <ClipboardTextIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-text-muted)' }} />
                }
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Recent Activity ── */}
        {token && recentTxs.length > 0 && (
          <motion.div variants={fadeUp}>
            <SectionLabel>Recent Activity</SectionLabel>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              {recentTxs.map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: i < recentTxs.length - 1 ? '1px solid var(--sweet-border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx('w-2 h-2 rounded-full shrink-0',
                        tx.type === 'PURCHASE' ? 'bg-green-400' :
                        tx.type === 'REFERRAL' ? 'bg-amber-400' : 'bg-stone-500'
                      )}
                    />
                    <p className="text-xs truncate max-w-[150px]" style={{ color: 'var(--sweet-text-secondary)' }}>
                      {tx.description || tx.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-green-500">+{Number(tx.pointsEarned).toLocaleString()}</p>
                    <p className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>{timeAgo(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Menu ── */}
        <motion.div variants={fadeUp}>
          <SectionLabel>Settings</SectionLabel>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
          >
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:scale-[0.98]"
                style={{
                  borderBottom: idx < menuItems.length - 1 ? '1px solid var(--sweet-border)' : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--sweet-input)' }}
                >
                  <item.icon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{item.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{item.description}</p>
                </div>
                <CaretRightIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--sweet-text-faint)' }} />
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Switch Role ── */}
        <motion.div variants={fadeUp}>
          <button
            onClick={handleSwitchRole}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] hover:opacity-80"
            style={{
              background: 'var(--sweet-card)',
              color: 'var(--sweet-text-secondary)',
              border: '1px solid var(--sweet-border)',
            }}
          >
            <ArrowsLeftRightIcon className="w-4 h-4" />
            {role === 'business' ? t('profile.switchToCustomer') : t('profile.switchToBusiness')}
          </button>
        </motion.div>

        {/* ── Disconnect ── */}
        <motion.div variants={fadeUp}>
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(239,68,68,0.05)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <SignOutIcon className="w-4 h-4" />
            {t('profile.disconnect')}
          </button>
        </motion.div>

        {/* ── Footer ── */}
        <motion.div variants={fadeUp} className="text-center pt-1 pb-2">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--sweet-text-faint)' }}>
            {t('profile.version')}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>{t('profile.diploma')}</p>
        </motion.div>
      </motion.div>

      {/* ════════════════════════════════════════
          EDIT PROFILE MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'edit'} onClose={() => setActiveModal(null)} title="Edit Profile">
        <div className="space-y-4">
          {[
            { icon: StorefrontIcon, label: 'Company / Display Name', type: 'text', value: editName, set: setEditName, placeholder: 'Your company name' },
            { icon: EnvelopeIcon,           label: 'Email',                  type: 'email', value: editEmail, set: setEditEmail, placeholder: 'your@email.com' },
          ].map(({ icon: Icon, label, type, value, set, placeholder }) => (
            <div key={label}>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--sweet-text-secondary)' }}>
                <Icon className="w-3 h-3" />{label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--sweet-input)', color: 'var(--sweet-text-secondary)', border: '1px solid var(--sweet-border)' }}
            >Cancel</button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || (!editName.trim() && !editEmail.trim())}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-bold transition-colors hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving
                ? <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
                : <><CheckIcon className="w-4 h-4" />Save</>
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════
          SECURITY MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'security'} onClose={() => setActiveModal(null)} title="Security">
        <div className="space-y-3">
          {[
            {
              title: 'Connected Wallet',
              content: (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mt-1 shrink-0" />
                    <p className="font-mono text-xs break-all" style={{ color: 'var(--sweet-text-secondary)' }}>
                      {wallet ? wallet.account.address : 'Not connected'}
                    </p>
                  </div>
                  {wallet && (
                    <button onClick={handleCopyAddress} className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--sweet-text-muted)' }}>
                      <ClipboardTextIcon className="w-3.5 h-3.5" />
                      {copied ? 'Copied!' : 'Copy full address'}
                    </button>
                  )}
                </div>
              ),
            },
            {
              title: 'Authentication',
              content: (
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>TON Wallet Signature</p>
                    <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Cryptographic proof — no password stored</p>
                  </div>
                </div>
              ),
            },
            {
              title: 'SBT Partner Certificate',
              content: (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${hasBusinessSbt ? 'bg-green-400' : 'bg-stone-500'}`} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
                        {hasBusinessSbt ? 'Valid — Bound to Wallet' : 'Not Issued'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>Soulbound Token — non-transferable</p>
                    </div>
                  </div>
                  {hasBusinessSbt && (
                    <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                  )}
                </div>
              ),
            },
            {
              title: 'Account Status',
              content: (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { l: 'Tier', v: tier, accent: false },
                    { l: 'Status', v: user?.status || 'ACTIVE', accent: true },
                    { l: 'Balance', v: `${balance.toLocaleString()} SWEET`, accent: false },
                    { l: 'Network', v: 'TON Testnet', accent: false },
                  ].map(({ l, v, accent }) => (
                    <div key={l}>
                      <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>{l}</p>
                      <p className={`font-bold mt-0.5 ${accent ? 'text-green-400' : ''}`} style={!accent ? { color: 'var(--sweet-text)' } : {}}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              ),
            },
          ].map(({ title, content }) => (
            <div key={title} className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-muted)' }}>{title}</p>
              {content}
            </div>
          ))}
          <button
            onClick={() => { setActiveModal(null); handleDisconnect(); }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Revoke All Sessions & Disconnect
          </button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════
          NOTIFICATIONS MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="Notifications">
        <div className="space-y-2.5">
          {[
            { label: 'Cashback Received',  subtitle: 'When SWEET tokens arrive in your wallet',     value: notifCashback,  set: setNotifCashback },
            { label: 'Reward Redeemed',    subtitle: 'Confirmation after a successful claim',        value: notifRewards,   set: setNotifRewards },
            { label: 'Push Notifications', subtitle: 'General app and system updates',               value: notifPush,      set: setNotifPush },
            { label: 'Marketing & Offers', subtitle: 'Special deals from partner confectioneries',  value: notifMarketing, set: setNotifMarketing },
          ].map(({ label, subtitle, value, set }) => (
            <div
              key={label}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="mr-4 flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{subtitle}</p>
              </div>
              <Toggle
                checked={value}
                onChange={(v) => { set(v); toast.success(`${label} ${v ? 'on' : 'off'}`, { duration: 1000 }); }}
              />
            </div>
          ))}
          <p className="text-[10px] text-center pt-1" style={{ color: 'var(--sweet-text-faint)' }}>
            Settings are saved locally on this device
          </p>
        </div>
      </Modal>

      {/* ════════════════════════════════════════
          HELP & SUPPORT MODAL
      ════════════════════════════════════════ */}
      <Modal open={activeModal === 'help'} onClose={() => setActiveModal(null)} title="Help & Support">
        <div className="space-y-3">
          <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-muted)' }}>Contact</p>
            <a href="https://t.me/marlenqq" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 py-1.5 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/25 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.014 9.49c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.56l-2.95-.924c-.642-.204-.654-.642.136-.953l11.527-4.443c.537-.194 1.006.13.679.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>Telegram Support</p>
                <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>@marlenqq</p>
              </div>
            </a>
            <a href="mailto:support@sweetloyalty.kz" className="flex items-center gap-3 py-1.5 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
                <EnvelopeIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>Email Support</p>
                <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>support@sweetloyalty.kz</p>
              </div>
            </a>
          </div>

          <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--sweet-text-muted)' }}>FAQ</p>
            {[
              { q: 'How do I earn SWEET tokens?',  a: 'Every purchase at a partner confectionery earns you SWEET tokens. 10% of the purchase amount is converted instantly.' },
              { q: 'How do I redeem rewards?',      a: 'Go to the Rewards section, choose an offer, and tap Redeem. A coupon code is generated immediately.' },
              { q: 'What is a tier system?',        a: 'Bronze → Silver → Gold. Higher tiers earn more tokens per purchase (1×, 1.5×, 2× multiplier).' },
              { q: 'Is my wallet data safe?',       a: 'Yes. We only store your public wallet address. Your private keys never leave your device.' },
              { q: 'What is an SBT Certificate?',   a: 'A Soulbound Token proves you are a verified partner. It is bound to your wallet and cannot be transferred.' },
            ].map(({ q, a }) => (
              <details key={q} className="group cursor-pointer">
                <summary className="text-sm font-semibold list-none flex justify-between items-start gap-2 select-none" style={{ color: 'var(--sweet-text)' }}>
                  <span>{q}</span>
                  <span className="group-open:rotate-180 transition-transform shrink-0 mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>▾</span>
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
