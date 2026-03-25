import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheckIcon, DocumentPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/GlassCard';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { setHasBusinessSbt, hasBusinessSbt } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState('UQ...TON...WALLET');
  const [isMinting, setIsMinting] = useState(false);

  const handleIssueCertificate = async () => {
    if (!walletAddress) {
      toast.error(t('admin.enterWallet') || 'Please enter a target wallet address');
      return;
    }

    setIsMinting(true);
    toast.loading(t('admin.mintingSBT') || 'Minting Soulbound Token on TON Blockchain...', { id: 'adminMint' });
    
    // Simulate Blockchain transaction delay
    await new Promise(r => setTimeout(r, 2500));
    
    setHasBusinessSbt(true);
    toast.success(t('admin.mintSuccess') || 'SBT Successfully issued and bound to wallet!', { id: 'adminMint' });
    setIsMinting(false);
  };

  const handleRevokeCertificate = async () => {
    setIsMinting(true);
    toast.loading(t('admin.revokingSBT') || 'Revoking Soulbound Token...', { id: 'adminRevoke' });
    
    await new Promise(r => setTimeout(r, 1500));
    
    setHasBusinessSbt(false);
    toast.success(t('admin.revokeSuccess') || 'Certificate has been revoked.', { id: 'adminRevoke' });
    setIsMinting(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 relative flex flex-col items-center justify-center">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <ShieldCheckIcon className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('admin.title') || 'Admin Control Panel'}</h1>
            <p className="text-zinc-400 text-sm">{t('admin.subtitle') || 'System Master Node'}</p>
          </div>
        </div>

        <GlassCard className="p-6 border-red-500/10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DocumentPlusIcon className="w-5 h-5 text-zinc-400" />
            {t('admin.issueSBT') || 'Issue Partner Certificate (SBT)'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                {t('admin.targetWallet') || 'Target Business Wallet'}
              </label>
              <input 
                type="text" 
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                placeholder="UQ..."
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleIssueCertificate}
                disabled={isMinting || hasBusinessSbt}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {hasBusinessSbt ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentPlusIcon className="w-5 h-5" />}
                {hasBusinessSbt 
                  ? (t('admin.alreadyIssued') || 'SBT Issued to Wallet') 
                  : (isMinting ? (t('home.minting') || 'Minting...') : (t('admin.mintButton') || 'Mint Certificate on TON'))}
              </button>
            </div>

            {hasBusinessSbt && (
              <button
                onClick={handleRevokeCertificate}
                disabled={isMinting}
                className="w-full mt-2 bg-transparent border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold py-3 rounded-xl transition-all text-sm"
              >
                {t('admin.revokeButton') || 'Revoke Certificate (Burn SBT)'}
              </button>
            )}
          </div>
        </GlassCard>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-xs text-balance">
            {t('admin.disclaimer') || 'This panel is strictly for Master Administrators to issue Soulbound Tokens to verified B2B partners for full ecosystem integration.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
