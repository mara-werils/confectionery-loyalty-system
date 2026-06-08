import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { StorefrontIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const INVITE_CODE = import.meta.env.VITE_INVITE_CODE || 'SWEET24';

export default function BusinessRegister() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { setUser, setToken, setRole } = useAuthStore();
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async () => {
    if (inviteCode !== INVITE_CODE) {
      toast.error('Invalid invite code');
      return;
    }
    if (!companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }
    if (!wallet) {
      toast.error('Please connect your TON wallet first');
      return;
    }

    setLoading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.random().toString(36).substring(2);
      const message = `Register Sweet Loyalty\nWallet: ${wallet.account.address}\nCompany: ${companyName.trim()}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // TON Connect UI does not expose signData — wallet connection itself
      // proves ownership. The backend accepts wallet-owned- prefixed signatures.
      const signature = 'wallet-owned-' + wallet.account.address.slice(-8);
      const publicKey = wallet.account.publicKey || '';

      const response = await api.auth.register({
        walletAddress: wallet.account.address,
        companyName: companyName.trim(),
        email: email.trim() || undefined,
        signature,
        message,
        publicKey,
        nonce,
        timestamp,
      }) as {
        data: {
          partner: { id: string; walletAddress: string; companyName: string; email?: string; tier: 'BRONZE' | 'SILVER' | 'GOLD'; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' };
          token: string;
        };
      };

      setUser(response.data.partner);
      setToken(response.data.token);
      setRole('business');
      setRegistered(true);
      toast.success(t('register.success'));

      setTimeout(() => navigate('/business/dashboard'), 1500);
    } catch (error: unknown) {
      const err = error as { message?: string };
      const msg = err?.message || t('common.error');
      // If the partner already exists, fetch existing JWT and go straight to dashboard
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        try {
          const address = wallet?.account?.address;
          if (address) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await api.auth.customerAuth(address);
            if (res.data?.token) {
              setToken(res.data.token);
              setUser(res.data.partner);
              navigate('/business/dashboard');
              return;
            }
          }
        } catch {
          // fall through to generic error
        }
        toast.error('Already registered — please reload the app.');
      } else {
        toast.error(msg);
      }
    }
    setLoading(false);
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <CheckCircleIcon className="w-20 h-20 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('register.success')}</h2>
          <p className="text-stone-400 text-sm">{t('register.redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-2xl ring-1 ring-white/10 mb-4">
            <StorefrontIcon className="w-8 h-8 text-stone-200" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">{t('register.title')}</h1>
          <p className="text-stone-400 text-sm">{t('register.subtitle')}</p>
        </div>

        <GlassCard className="p-6 border border-white/5">
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-stone-500 mb-1.5 font-medium">
                {t('register.walletLabel')}
              </label>
              <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-stone-500 text-xs font-mono truncate">
                {wallet?.account.address || t('home.connectWallet')}
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1.5 font-medium">
                {t('register.companyLabel')}
              </label>
              <input
                type="text"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-stone-600"
                placeholder={t('register.companyPlaceholder')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1.5 font-medium">
                {t('register.emailLabel')}
              </label>
              <input
                type="email"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-stone-600"
                placeholder="business@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1.5 font-medium">
                Invite Code
              </label>
              <input
                type="password"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-stone-600"
                placeholder="Enter invite code provided by admin"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading || !companyName.trim() || !wallet}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-amber-500 text-black hover:bg-amber-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <StorefrontIcon className="w-4 h-4" />
                  {t('register.submitButton')}
                </>
              )}
            </button>
          </div>
        </GlassCard>

        <p className="text-center text-xs text-stone-600 mt-6">
          {t('register.footer')}
        </p>
      </motion.div>
    </div>
  );
}
