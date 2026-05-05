import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/GlassCard';
import AdminLayout from './AdminLayout';

export default function AdminAuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@sweetloyalty.kz';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'MasterKey2026!';
    if (email === adminEmail && password === adminPassword) {
      toast.success('Аутентификация успешна');
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      toast.error('Неверные данные. Доступ запрещён.');
    }
    setVerifying(false);
  };

  if (isAuthenticated) {
    return <AdminLayout />;
  }

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-white flex items-center justify-center p-6 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <ShieldCheckIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Зона ограниченного доступа</h1>
          <p className="text-stone-400 text-sm mt-2">Вход мастер-администратора</p>
        </div>
        <GlassCard className="p-6 border-amber-500/10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Email администратора</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                placeholder="admin@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Мастер-пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors tracking-widest"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-all"
              >
                {verifying ? 'Проверка...' : 'Войти'}
              </button>
            </div>
          </form>
        </GlassCard>
        <p className="text-center text-stone-600 text-[10px] mt-6">
          Только для авторизованных администраторов
        </p>
      </motion.div>
    </div>
  );
}
