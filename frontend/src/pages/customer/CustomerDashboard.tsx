import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  SparklesIcon,
  ClockIcon,
  ArrowDownIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from '../../components/GlassCard';
import { useNavigate } from 'react-router-dom';

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

export default function CustomerDashboard() {
  const wallet = useTonWallet();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<JettonBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const walletAddress = wallet?.account.address || '';

  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://testnet.tonapi.io/v2/accounts/${walletAddress}/jettons`
        );
        const data = await res.json();

        if (data.balances && data.balances.length > 0) {
          const sweet = data.balances.find(
            (b: any) =>
              b.jetton?.address?.toLowerCase() ===
              '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
          );
          if (sweet) {
            setBalance({
              balance: sweet.balance,
              decimals: sweet.jetton?.decimals || 9,
            });
          }
        }

        const txRes = await fetch(
          `https://testnet.tonapi.io/v2/accounts/${walletAddress}/events?limit=10`
        );
        const txData = await txRes.json();

        if (txData.events) {
          const parsed: Transaction[] = txData.events
            .filter((e: any) => e.actions?.some((a: any) => a.type === 'JettonTransfer'))
            .map((e: any) => {
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
      } catch (error) {
        console.error('Failed to fetch blockchain data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [walletAddress]);

  const formatBalance = (bal: JettonBalance | null) => {
    if (!bal) return '0';
    const raw = BigInt(bal.balance);
    const divisor = BigInt(10 ** bal.decimals);
    const whole = raw / divisor;
    return whole.toLocaleString();
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-6);
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 text-white">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('customerDashboard.title')}</h1>
        <p className="text-zinc-400 mt-1 text-sm">{t('customerDashboard.subtitle')}</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <GlassCard className="p-6 border border-white/5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium mb-1">{t('customerDashboard.balance')}</p>
              <p className="text-4xl font-extrabold tracking-tight">
                {loading ? (
                  <span className="inline-block w-24 h-10 bg-white/5 rounded-lg animate-pulse" />
                ) : (
                  formatBalance(balance)
                )}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                ≈ {formatBalance(balance)} KZT
              </p>
            </div>
            <div className="p-2.5 bg-white/5 rounded-xl ring-1 ring-white/10">
              <SparklesIcon className="w-6 h-6 text-zinc-300" />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* QR Code */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <GlassCard className="p-6 border border-white/5 text-center">
          <p className="text-xs text-zinc-500 font-medium mb-4">
            {t('customerDashboard.showQr')}
          </p>
          <div className="inline-block bg-white p-4 rounded-2xl">
            <QRCodeSVG
              value={walletAddress}
              size={160}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-3 font-mono break-all px-4">
            {walletAddress}
          </p>
        </GlassCard>
      </motion.div>

      {/* Browse Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <button onClick={() => navigate('/customer/rewards')} className="w-full">
          <GlassCard className="flex items-center gap-4 p-5 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
            <div className="p-3 bg-white/5 rounded-xl ring-1 ring-white/10">
              <GiftIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">{t('customerDashboard.rewardsLink')}</h3>
              <p className="text-xs text-zinc-400">{t('customerDashboard.rewardsDesc')}</p>
            </div>
          </GlassCard>
        </button>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-400">{t('customerDashboard.recentCashback')}</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <GlassCard className="p-6 border border-white/5 text-center">
            <ArrowDownIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">{t('customerDashboard.noTransactions')}</p>
            <p className="text-xs text-zinc-600 mt-1">
              {t('customerDashboard.noTransactionsHint')}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <GlassCard
                key={tx.hash}
                className="flex items-center justify-between p-4 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <ArrowDownIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.comment || t('customerDashboard.cashback')}</p>
                    <p className="text-xs text-zinc-500">
                      from {formatAddress(tx.sender)} · {timeAgo(tx.timestamp)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-green-400">
                  +{(Number(tx.amount) / 1e9).toLocaleString()} SWEET
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
