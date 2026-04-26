import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheckIcon, DocumentPlusIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/GlassCard';
import { useAuditLogs } from '../../hooks/useApi';

const ACTION_COLORS: Record<string, string> = {
  ISSUE_SBT: 'text-red-400 bg-red-400/10 border-red-400/20',
  ISSUE_COUPON: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  UPDATE_PARTNER: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  MINT_TOKENS: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { setHasBusinessSbt, hasBusinessSbt } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState('UQ...TON...WALLET');
  const [isMinting, setIsMinting] = useState(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: auditLogsData, isLoading: auditLoading } = useAuditLogs(1);
  const auditLogs: {
    id: string;
    actorId: string;
    actorType: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
  }[] = (auditLogsData as { data: typeof auditLogs })?.data || [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    await new Promise(r => setTimeout(r, 800));

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@sweetloyalty.kz';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'MasterKey2026!';

    if (email === adminEmail && password === adminPassword) {
      toast.success('Authentication successful', { id: 'adminAuth' });
      setIsAuthenticated(true);
    } else {
      toast.error('Invalid credentials. Access denied.', { id: 'adminAuth' });
    }
    setIsVerifying(false);
  };

  const handleIssueCertificate = async () => {
    if (!walletAddress) {
      toast.error(t('admin.enterWallet') || 'Please enter a target wallet address');
      return;
    }

    setIsMinting(true);
    toast.loading(t('admin.mintingSBT') || 'Minting Soulbound Token on TON Blockchain...', { id: 'adminMint' });
    
    try {
      // Simulate Blockchain transaction delay for visual effect
      await new Promise(r => setTimeout(r, 2000));
      
      // Persist the credential to the backend
      const { api } = await import('../../services/api');
      await api.admin.issueSbt(walletAddress);

      setHasBusinessSbt(true);
      toast.success(t('admin.mintSuccess') || 'SBT Successfully issued and bound to wallet!', { id: 'adminMint' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to issue certificate', { id: 'adminMint' });
    } finally {
      setIsMinting(false);
    }
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

      {!isAuthenticated ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm z-10"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
              <ShieldCheckIcon className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Restricted Area</h1>
            <p className="text-zinc-400 text-sm mt-2">Master Administrator Login</p>
          </div>

          <GlassCard className="p-6 border-red-500/10">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Admin Email
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="admin@domain.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Master Password
                </label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors tracking-widest"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  {isVerifying ? 'Verifying Identity...' : 'Authenticate'}
                </button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      ) : (
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

        {/* Audit Log */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <GlassCard className="p-6 border-red-500/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-zinc-400" />
              Action History
            </h2>
            {auditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2.5 px-3 bg-white/[0.03] rounded-xl border border-white/5"
                  >
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded border ${
                        ACTION_COLORS[log.action] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
                      }`}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 truncate">
                        {log.entityType}
                        {log.entityId ? ` · ${log.entityId.slice(0, 12)}…` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {formatRelative(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-zinc-600 text-sm py-4">No actions recorded yet</p>
            )}
          </GlassCard>
        </motion.div>
        </motion.div>
      )}
    </div>
  );
}
