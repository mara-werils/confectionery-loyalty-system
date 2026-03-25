import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { SparklesIcon, BuildingStorefrontIcon, UserIcon } from '@heroicons/react/24/outline';
import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { role, setRole } = useAuthStore();

  // If wallet connected and role already selected, redirect
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
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-800/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-3xl shadow-xl ring-1 ring-white/10 mb-5 backdrop-blur-md">
            <SparklesIcon className="w-10 h-10 text-zinc-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
            Sweet Loyalty
          </h1>
          <p className="text-zinc-400 text-base">
            Blockchain loyalty system for confectioneries
          </p>
        </motion.div>

        {/* Step 1: Connect Wallet (if not connected) */}
        {!wallet && (
          <GlassCard className="w-full mb-8 p-8 border-t border-white/10" delay={0.1}>
            <p className="text-zinc-400 mb-6 text-sm">
              Connect your TON wallet to get started
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </GlassCard>
        )}

        {/* Step 2: Choose Role (if wallet connected but no role) */}
        {wallet && !role && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            <p className="text-zinc-400 text-sm mb-6">Choose how you want to use the platform</p>

            <button
              onClick={() => handleRoleSelect('business')}
              className="w-full group"
            >
              <GlassCard className="flex items-center gap-5 p-5 text-left hover:bg-white/5 transition-all border border-white/5 hover:border-white/15 cursor-pointer">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 transition-colors">
                  <BuildingStorefrontIcon className="w-7 h-7 text-zinc-200" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-0.5">I'm a Business</h3>
                  <p className="text-sm text-zinc-400">Register your confectionery and send cashback to customers</p>
                </div>
              </GlassCard>
            </button>

            <button
              onClick={() => handleRoleSelect('customer')}
              className="w-full group"
            >
              <GlassCard className="flex items-center gap-5 p-5 text-left hover:bg-white/5 transition-all border border-white/5 hover:border-white/15 cursor-pointer">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 transition-colors">
                  <UserIcon className="w-7 h-7 text-zinc-200" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-0.5">I'm a Customer</h3>
                  <p className="text-sm text-zinc-400">Check your SWEET balance, browse rewards, receive cashback</p>
                </div>
              </GlassCard>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
