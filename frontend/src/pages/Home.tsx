import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SparklesIcon, BuildingStorefrontIcon, UserIcon } from '@heroicons/react/24/outline';
import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { useAuthStore } from '../store/authStore';
import { changeLanguage, languages } from '../i18n';

export default function Home() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { role, setRole } = useAuthStore();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (wallet && role === 'business') {
      navigate('/business/dashboard');
    } else if (wallet && role === 'customer') {
      navigate('/customer/dashboard');
    }
  }, [wallet, role, navigate]);

  const handleRoleSelect = (selectedRole: 'business' | 'customer') => {
    setRole(selectedRole);
    if (selectedRole === 'business') {
      navigate('/business/register');
    } else {
      navigate('/customer/dashboard');
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-800/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-20 flex gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              i18n.language === lang.code
                ? 'bg-white text-black'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
            }`}
          >
            {lang.flag}
          </button>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-3xl shadow-xl ring-1 ring-white/10 mb-5 backdrop-blur-md">
            <SparklesIcon className="w-10 h-10 text-zinc-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
            {t('home.title')}
          </h1>
          <p className="text-zinc-400 text-base">
            {t('home.subtitle')}
          </p>
        </motion.div>

        {!wallet && (
          <GlassCard className="w-full mb-8 p-8 border-t border-white/10" delay={0.1}>
            <p className="text-zinc-400 mb-6 text-sm">
              {t('home.connectWallet')}
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </GlassCard>
        )}

        {wallet && !role && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            <p className="text-zinc-400 text-sm mb-6">{t('home.chooseRole')}</p>

            <button onClick={() => handleRoleSelect('business')} className="w-full group">
              <GlassCard className="flex items-center gap-5 p-5 text-left hover:bg-white/5 transition-all border border-white/5 hover:border-white/15 cursor-pointer">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 transition-colors">
                  <BuildingStorefrontIcon className="w-7 h-7 text-zinc-200" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-0.5">{t('home.business')}</h3>
                  <p className="text-sm text-zinc-400">{t('home.businessDesc')}</p>
                </div>
              </GlassCard>
            </button>

            <button onClick={() => handleRoleSelect('customer')} className="w-full group">
              <GlassCard className="flex items-center gap-5 p-5 text-left hover:bg-white/5 transition-all border border-white/5 hover:border-white/15 cursor-pointer">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 transition-colors">
                  <UserIcon className="w-7 h-7 text-zinc-200" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-0.5">{t('home.customer')}</h3>
                  <p className="text-sm text-zinc-400">{t('home.customerDesc')}</p>
                </div>
              </GlassCard>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
