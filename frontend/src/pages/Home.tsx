import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BuildingStorefrontIcon, UserIcon } from '@heroicons/react/24/outline';
import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { changeLanguage, languages } from '../i18n';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function Home() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { role, setRole, setHasBusinessSbt, setToken, setUser } = useAuthStore();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (wallet && role === 'business') {
      navigate('/business/dashboard');
    } else if (wallet && role === 'customer') {
      navigate('/customer/dashboard');
    }
  }, [wallet, role, navigate]);

  const handleRoleSelect = async (selectedRole: 'business' | 'customer') => {
    if (selectedRole === 'business') {
      toast.loading(t('home.checkingCert') || 'Verifying Partner Certificate on TON...', { id: 'certCheck' });

      const address = wallet?.account?.address;
      if (!address) {
        toast.error('Wallet not connected', { id: 'certCheck' });
        return;
      }

      try {
        await new Promise(r => setTimeout(r, 1000));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await api.admin.checkSbt(address);

        if (!res.data || !res.data.hasSbt) {
          toast.error(t('home.noCertFound') || 'Access Denied: Partner SBT Certificate not found in wallet.', { id: 'certCheck' });
          return;
        }

        setHasBusinessSbt(true);
        toast.success(t('home.certVerified') || 'Partner Certificate Verified!', { id: 'certCheck' });
      } catch {
        toast.error('Verification failed due to server error', { id: 'certCheck' });
        return;
      }
    }

    setRole(selectedRole);
    if (selectedRole === 'business') {
      // Check if already registered — if so, skip the registration form
      const existingToken = useAuthStore.getState().token;
      if (existingToken) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const meRes: any = await api.auth.me();
          const partner = meRes?.data?.partner;
          if (partner && !partner.companyName.startsWith('Customer_')) {
            setUser(partner);
            navigate('/business/dashboard');
            return;
          }
        } catch {
          // token invalid or not set — fall through to register
        }
      }
      navigate('/business/register');
    } else {
      // Auto-authenticate customer by wallet address so API calls work
      const address = wallet?.account?.address;
      if (address) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await api.auth.customerAuth(address);
          if (res.data?.token) {
            setToken(res.data.token);
            setUser(res.data.partner);
          }
        } catch {
          // Non-fatal: customer can still browse, coupon redemption will show proper error
        }
      }
      navigate('/customer/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-white relative overflow-hidden flex flex-col">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(180,122,90,0.05),transparent)]" />

      {/* Language switcher */}
      <div className="absolute top-5 right-5 z-20 flex gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-9 h-9 rounded-full text-sm font-bold transition-all flex items-center justify-center ${
              i18n.language === lang.code
                ? 'bg-amber-400/20 text-amber-400 ring-1 ring-amber-400/40'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {lang.flag}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-600/10 border border-amber-400/20" />
            <span className="text-3xl relative z-10">🍬</span>
          </div>

          <h1 className="text-5xl font-black tracking-tight mb-2">
            <span className="text-white">sweet</span>
            <span className="text-amber-400">.</span>
          </h1>
          <p className="text-stone-500 text-sm font-medium tracking-wide uppercase">
            Loyalty · Web3 · TON
          </p>
        </motion.div>

        {/* Wallet connect section */}
        {!wallet && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm"
          >
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center">
              <p className="text-stone-400 text-sm mb-5 leading-relaxed">
                {t('home.connectWallet')}
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[11px] text-stone-600 tracking-widest uppercase">Powered by TON</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          </motion.div>
        )}

        {/* Role selection */}
        {wallet && !role && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm space-y-3"
          >
            <p className="text-center text-stone-500 text-xs tracking-wider uppercase mb-5">
              {t('home.chooseRole')}
            </p>

            <RoleButton
              icon={<UserIcon className="w-5 h-5" />}
              label={t('home.customer')}
              desc={t('home.customerDesc')}
              accent="amber"
              onClick={() => handleRoleSelect('customer')}
            />

            <RoleButton
              icon={<BuildingStorefrontIcon className="w-5 h-5" />}
              label={t('home.business')}
              desc={t('home.businessDesc')}
              accent="orange"
              onClick={() => handleRoleSelect('business')}
            />
          </motion.div>
        )}

        {/* How it works */}
        {!wallet && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm mt-10"
          >
            <p className="text-center text-[11px] text-zinc-600 tracking-widest uppercase mb-5">
              How it works
            </p>
            <div className="space-y-3">
              {[
                { step: '1', icon: '🔗', title: 'Connect TON Wallet', desc: 'Link your TON wallet to get started — no sign-up needed.' },
                { step: '2', icon: '🏪', title: 'Shop at partner confectioneries', desc: 'Make purchases at Sweet Network partner stores.' },
                { step: '3', icon: '🍬', title: 'Earn SWEET & redeem rewards', desc: 'Accumulate SWEET tokens and exchange them for real rewards.' },
              ].map(({ step, icon, title, desc }) => (
                <div
                  key={step}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/15 flex items-center justify-center text-sm flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{title}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 pb-8 flex justify-center"
      >
        <p className="text-[11px] text-stone-700">
          Confectionery Loyalty · AITU 2026
        </p>
      </motion.div>
    </div>
  );
}

function RoleButton({
  icon,
  label,
  desc,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  accent: 'amber' | 'orange';
  onClick: () => void;
}) {
  const accentClasses = {
    amber: 'group-hover:bg-amber-400/10 group-hover:border-amber-400/30 group-hover:text-amber-400',
    orange: 'group-hover:bg-orange-400/10 group-hover:border-orange-400/30 group-hover:text-orange-400',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200 text-left"
    >
      <div className={`w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-stone-400 transition-all duration-200 flex-shrink-0 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white text-sm">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
      </div>
      <div className="ml-auto text-stone-700 group-hover:text-stone-500 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
}
