import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { BuildingStorefrontIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function BusinessRegister() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { setUser, setToken } = useAuthStore();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async () => {
    if (!companyName.trim()) {
      toast.error('Введите название компании');
      return;
    }
    if (!wallet) {
      toast.error('Подключите кошелек');
      return;
    }

    setLoading(true);
    try {
      // For MVP demo: simulate successful registration
      // In production: calls POST /api/v1/auth/register with wallet signature
      await new Promise(r => setTimeout(r, 1200));

      const mockUser = {
        id: 'partner-' + Date.now(),
        walletAddress: wallet.account.address,
        companyName: companyName.trim(),
        email: email || undefined,
        tier: 'BRONZE' as const,
        status: 'ACTIVE' as const,
      };

      setUser(mockUser);
      setToken('demo-jwt-' + Date.now());
      setRegistered(true);
      toast.success('Бизнес успешно зарегистрирован!');

      setTimeout(() => {
        navigate('/business/dashboard');
      }, 1500);
    } catch (error) {
      toast.error('Ошибка регистрации');
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
          <h2 className="text-2xl font-bold text-white mb-2">Регистрация завершена!</h2>
          <p className="text-zinc-400 text-sm">Перенаправление в панель управления...</p>
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
            <BuildingStorefrontIcon className="w-8 h-8 text-zinc-200" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Регистрация бизнеса</h1>
          <p className="text-zinc-400 text-sm">Зарегистрируйте вашу кондитерскую на платформе</p>
        </div>

        <GlassCard className="p-6 border border-white/5">
          <div className="space-y-5">
            {/* Wallet address (auto-filled) */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                Кошелек TON
              </label>
              <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-500 text-xs font-mono truncate">
                {wallet?.account.address || 'Подключите кошелек'}
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                Название кондитерской *
              </label>
              <input
                type="text"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-zinc-600"
                placeholder="например: Sweet Dreams"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                Email (необязательно)
              </label>
              <input
                type="email"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-zinc-600"
                placeholder="business@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Register button */}
            <button
              onClick={handleRegister}
              disabled={loading || !companyName.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-white text-black hover:bg-zinc-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <BuildingStorefrontIcon className="w-4 h-4" />
                  Зарегистрировать бизнес
                </>
              )}
            </button>
          </div>
        </GlassCard>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Ваш кошелек будет использоваться для отправки кэшбэка клиентам
        </p>
      </motion.div>
    </div>
  );
}
