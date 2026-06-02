import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  GiftIcon,
  TicketIcon,
  TrophyIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { TIER_CONFIG } from '../../config/tiers';
import AnimatedNumber from '../../components/AnimatedNumber';
import LiveFeed from '../../components/LiveFeed';
import { useMutation } from '@tanstack/react-query';

const TIERS = TIER_CONFIG;

const JETTON_ADDRESS = 'kQBNOiJ4aToE-Ea12DpY5nBmu1bKT0axt81JmS9BFPh8nCio';
const JETTON_EXPLORER_URL = `https://testnet.tonviewer.com/${JETTON_ADDRESS}`;

interface JettonBalance {
  balance: string;
  decimals: number;
}

interface Transaction {
  hash: string;
  amount: string;
  sender: string;
  comment: string;
  timestamp: number;
}

function safeFromJettonRaw(rawBalance: string, decimals: number): number {
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, Math.min(18, decimals)) : 9;
  const parsed = Number(rawBalance);
  if (!Number.isFinite(parsed)) return 0;
  const divisor = Math.pow(10, safeDecimals);
  return Math.floor(parsed / divisor);
}

export default function CustomerDashboard() {
  const wallet = useTonWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeCoupons, sweetBalance, setSweetBalance, token } = useAuthStore();
  const [balance, setBalance] = useState<JettonBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);

  const walletAddress = wallet?.account.address || '';

  const { data: achievementsData } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.achievements.getAll(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const rawAchievements =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (achievementsData as any)?.data;
  const allAchievements: { id: string; name: string; icon: string; unlockedAt?: string }[] = Array.isArray(rawAchievements)
    ? rawAchievements
    : [];
  const unlockedAchievements = allAchievements.filter((a) => !!a.unlockedAt).slice(0, 2);

  // NOTE: realtime socket updates are intentionally disabled here for maximum webview stability.

  const fetchData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}/jettons`);
      const data = await res.json();

      if (Array.isArray(data?.balances) && data.balances.length > 0) {
        const sweet = data.balances.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (b: any) => b.jetton?.address?.toLowerCase() === '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
        );
        if (sweet) {
          setBalance({ balance: sweet.balance, decimals: sweet.jetton?.decimals || 9 });
          setSweetBalance(safeFromJettonRaw(sweet.balance, sweet.jetton?.decimals || 9));
        }
      }

      const txRes = await fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}/events?limit=10`);
      const txData = await txRes.json();

      if (Array.isArray(txData?.events)) {
        const parsed: Transaction[] = txData.events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((e: any) => e.actions?.some((a: any) => a.type === 'JettonTransfer'))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((e: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const action = e.actions.find((a: any) => a.type === 'JettonTransfer');
            return {
              hash: e.event_id,
              amount: action?.JettonTransfer?.amount || '0',
              sender: action?.JettonTransfer?.sender?.address || 'unknown',
              comment: action?.JettonTransfer?.comment || t('customerDashboard.cashback'),
              timestamp: e.timestamp,
            };
          });
        setTransactions(parsed);
      }
    } catch {
      // Silently handle network errors
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [walletAddress, location.pathname]);

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return t('customerDashboard.justNow');
    if (diff < 3600) return t('customerDashboard.minsAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('customerDashboard.hoursAgo', { n: Math.floor(diff / 3600) });
    return t('customerDashboard.daysAgo', { n: Math.floor(diff / 86400) });
  };

  const currentBalance = sweetBalance > 0 ? sweetBalance : safeFromJettonRaw(balance?.balance || '0', balance?.decimals || 9);
  const tier = currentBalance >= 20000 ? 'GOLD' : currentBalance >= 5000 ? 'SILVER' : 'BRONZE';
  const tierData = TIERS[tier];
  const progress = tier === 'GOLD' ? 100 : Math.min(100, Math.round((currentBalance / tierData.threshold) * 100));

  return (
    <div className="pb-28 text-white">
      {/* Hero Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl mb-4"
        style={{
          background: 'linear-gradient(135deg, #1a0e00 0%, #0f0800 50%, #0d0b0a 100%)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}
      >
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/8 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] text-amber-400/70 font-semibold tracking-widest uppercase">
                  {t('customerDashboard.sweetBalance')}
                </p>
                <a
                  href={JETTON_EXPLORER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors"
                  title={t('customerDashboard.verifiedOnTon')}
                >
                  <ShieldCheckIcon className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-400 tracking-wide">{t('customerDashboard.verifiedTon')}</span>
                </a>
              </div>
              {loading ? (
                <div className="w-28 h-9 rounded-lg bg-white/5 animate-pulse" />
              ) : (
                <p className="text-4xl font-black tracking-tight text-white">
                  <AnimatedNumber value={currentBalance} />
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-stone-600 font-mono">{t('customerDashboard.sweetTokens')}</p>
                <a
                  href={JETTON_EXPLORER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-stone-600 hover:text-stone-400 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
                  {t('customerDashboard.viewOnChain')}
                </a>
              </div>
              {!loading && currentBalance > 0 && (
                <p className="text-xs text-amber-400/60 mt-0.5 font-mono">
                  ≈ {(currentBalance * 0.15).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₸
                </p>
              )}
            </div>

            <button
              onClick={() => setQrVisible(v => !v)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 hover:bg-stone-700 transition-colors"
            >
              <span className="text-[9px] font-bold text-stone-400 tracking-wider">QR</span>
            </button>
          </div>

          {/* Tier row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-3.5 h-3.5 text-stone-600" />
              <span className={clsx('text-xs font-bold', tierData.color)}>{t(tierData.labelKey)}</span>
            </div>
            {tier !== 'GOLD' && (
              <span className="text-[10px] text-stone-600">
                {(tierData.threshold - currentBalance).toLocaleString()} {t('customerDashboard.toNext', { next: tierData.next })}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
              className={clsx('h-full rounded-full', tierData.bar)}
            />
          </div>
        </div>

        {/* Expandable QR */}
        <AnimatePresence>
          {qrVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 flex flex-col items-center">
                <div className="w-full h-px bg-white/5 mb-4" />
                <p className="text-[11px] text-stone-500 mb-3 text-center">
                  {t('customerDashboard.showQr')}
                </p>
                <div className="bg-white p-3 rounded-2xl">
                  <QRCodeSVG value={walletAddress} size={160} level="M" bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className="text-[9px] text-stone-700 mt-2 font-mono break-all text-center px-4">
                  {walletAddress}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Live Activity Feed */}
      <LiveFeed />

      {/* Daily Check-in */}
      <DailyCheckinCard />

      {/* Next Reward Progress */}
      {!loading && currentBalance > 0 && currentBalance < 500 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4 p-4 rounded-2xl border border-amber-400/10 bg-amber-400/[0.03]"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GiftIcon className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-stone-300">{t('customerDashboard.nextReward') || 'Next Reward'}</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">
              {currentBalance}/500 SWEET
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (currentBalance / 500) * 100)}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
            />
          </div>
          <p className="text-[10px] text-stone-600 mt-1.5">
            {t('customerDashboard.moreToUnlock', { amount: (500 - currentBalance).toLocaleString() }) || `${(500 - currentBalance).toLocaleString()} more SWEET to unlock your first reward`}
          </p>
        </motion.div>
      )}

      {/* Quick actions row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => navigate('/customer/rewards')}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-700 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
            <GiftIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{t('customerDashboard.rewardsLink')}</p>
            <p className="text-[10px] text-stone-600">{t('customerDashboard.exchange')}</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/achievements')}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-700 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
            <TrophyIcon className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{t('customerDashboard.achievementsTitle')}</p>
            <p className="text-[10px] text-stone-600">{t('customerDashboard.nftBadges')}</p>
          </div>
        </button>
      </div>

      {/* Blockchain Info Card */}
      <BlockchainInfoCard walletAddress={walletAddress} />

      {/* Active Coupons */}
      {activeCoupons && activeCoupons.length > 0 && (
        <div className="mb-4">
          <SectionHeader icon={<TicketIcon className="w-3.5 h-3.5" />} label={t('customerDashboard.myCoupons') || 'Active Coupons'} />
          <div className="space-y-2">
            {activeCoupons.map((coupon, i) => (
              <div
                key={i}
                className="relative flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 overflow-hidden"
              >
                <div className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-[#0d0b0a] -translate-y-1/2" />
                <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-[#0d0b0a] -translate-y-1/2" />
                <div>
                  <p className="text-xs font-semibold text-white">{t(coupon.rewardTitleKey)}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{coupon.partnerName}</p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider shrink-0">
                  {coupon.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Preview */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-stone-500">
              <TrophyIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold tracking-wide">{t('customerDashboard.myAchievements')}</span>
            </div>
            <Link
              to="/achievements"
              className="flex items-center gap-0.5 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors font-medium"
            >
              {t('customerDashboard.viewAll')} <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {unlockedAchievements.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03]"
              >
                <TrophyIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-white leading-tight truncate">{ach.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <SectionHeader icon={<ClockIcon className="w-3.5 h-3.5" />} label={t('customerDashboard.recentCashback')} />

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-stone-900 border border-stone-800 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-10 text-center">
            <ArrowDownIcon className="w-8 h-8 text-stone-800 mx-auto mb-3" />
            <p className="text-sm text-stone-600">{t('customerDashboard.noTransactions')}</p>
            <p className="text-xs text-stone-700 mt-1">{t('customerDashboard.noTransactionsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div
                key={tx.hash}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <ArrowDownIcon className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-white">{tx.comment || t('customerDashboard.cashback')}</p>
                      <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <ShieldCheckIcon className="w-2 h-2 text-emerald-400" />
                        <span className="text-[8px] font-bold text-emerald-400">on-chain</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-stone-600">
                        {formatAddress(tx.sender)} · {timeAgo(tx.timestamp)}
                      </p>
                      {tx.hash && (
                        <a
                          href={`https://testnet.tonviewer.com/transaction/${tx.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-[10px] text-stone-600 hover:text-stone-400 transition-colors font-mono"
                          title={t('customerDashboard.viewTx')}
                        >
                          <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
                          {tx.hash.length > 12 ? tx.hash.slice(0, 6) + '…' + tx.hash.slice(-4) : tx.hash}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-bold text-green-400 shrink-0">
                  +{(Number(tx.amount) / 1e9).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockchainInfoCard({ walletAddress }: { walletAddress: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortAddr = (addr: string) =>
    addr && addr.length > 12 ? addr.slice(0, 8) + '…' + addr.slice(-6) : addr;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-4 rounded-2xl border border-stone-800 bg-stone-900/60 overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold text-stone-300">{t('customerDashboard.blockchainInfo')}</span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-bold text-emerald-400 tracking-wide">LIVE</span>
          </span>
        </div>
        <ChevronDownIcon className={clsx('w-3.5 h-3.5 text-stone-500 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-stone-800/60 pt-3">
              {/* Network */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">{t('customerDashboard.network')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-stone-300">TON Testnet</span>
                </div>
              </div>

              {/* Wallet */}
              {walletAddress && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider">{t('customerDashboard.yourWallet')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-stone-400">{shortAddr(walletAddress)}</span>
                    <button
                      onClick={() => copyToClipboard(walletAddress)}
                      className="p-0.5 rounded hover:text-stone-300 text-stone-600 transition-colors"
                      title={t('customerDashboard.copyAddress')}
                    >
                      {copied
                        ? <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
                        : <DocumentDuplicateIcon className="w-3 h-3" />
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Smart Contract */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">{t('customerDashboard.smartContract')}</span>
                <a
                  href={JETTON_EXPLORER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {shortAddr(JETTON_ADDRESS)}
                  <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-stone-500">
      {icon}
      <span className="text-xs font-semibold tracking-wide">{label}</span>
    </div>
  );
}

function DailyCheckinCard() {
  const { t } = useTranslation();
  const { token, setSweetBalance, sweetBalance } = useAuthStore();

  const { data: statusRaw, refetch } = useQuery({
    queryKey: ['checkin-status'],
    queryFn: () => api.checkin.status(),
    enabled: !!token,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (statusRaw as any)?.data;

  const claimMutation = useMutation({
    mutationFn: () => api.checkin.claim(),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res as any).data;
      setSweetBalance(sweetBalance + data.bonus);
      toast.success(data.message);
      refetch();
    },
    onError: () => {
      // Fallback: client-side checkin when backend unavailable
      const bonus = 10;
      setSweetBalance(sweetBalance + bonus);
      toast.success(`+${bonus} SWEET daily bonus!`);
      localStorage.setItem('lastCheckin', new Date().toISOString());
      refetch();
    },
  });

  // Local fallback state when API unavailable
  const localCheckedToday = (() => {
    const last = localStorage.getItem('lastCheckin');
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  })();

  const streak = status?.currentStreak || 0;
  const canClaim = status?.canClaim ?? !localCheckedToday;
  const multiplier = status?.multiplier || 1;
  const days = status?.history || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-4 sweet-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{t('checkin.dailyBonus') || 'Daily Bonus'}</p>
            <p className="text-[10px] text-stone-500">
              {streak > 0 ? `${streak} day streak · x${multiplier}` : t('checkin.startStreak') || 'Start your streak!'}
            </p>
          </div>
        </div>
        <button
          onClick={() => canClaim && claimMutation.mutate()}
          disabled={!canClaim || claimMutation.isPending}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            canClaim
              ? 'bg-amber-500 text-black hover:bg-amber-400'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          {claimMutation.isPending ? '...' : canClaim ? `+${status?.nextBonus || 10} SWEET` : 'Claimed'}
        </button>
      </div>

      {/* Week dots */}
      <div className="flex items-center justify-between gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
          const today = new Date();
          const dayDate = new Date(today);
          dayDate.setDate(today.getDate() - today.getDay() + i + 1);
          const dateStr = dayDate.toISOString().split('T')[0];
          const checked = days.some((d: { date: string }) => d.date === dateStr);
          const isToday = dateStr === today.toISOString().split('T')[0];

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-stone-600">{day}</span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                checked
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : isToday
                    ? 'border-amber-400/50 text-amber-400 bg-amber-400/10'
                    : 'border-stone-700 text-stone-600 bg-stone-800'
              }`}>
                {checked ? '✓' : isToday ? '·' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
