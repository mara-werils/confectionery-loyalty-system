import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import {
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/GlassCard';
import { useAuthStore } from '../store/authStore';
import { EcosystemService } from '../services/ecosystem';

// SWEET Jetton address on TON testnet
const SWEET_JETTON_ADDRESS = 'kQBNOiJ4aToE-Ea12DpY5nBmu1bKT0axt81JmS9BFPh8nCio';

// DeDust testnet pool URL for SWEET/TON
const DEDUST_SWAP_URL = `https://dedust.io/swap/TON/${SWEET_JETTON_ADDRESS}`;

export default function Swap() {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { sweetBalance } = useAuthStore();

  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [direction, setDirection] = useState<'TON_TO_SWEET' | 'SWEET_TO_TON'>('TON_TO_SWEET');
  const [tonBalance, setTonBalance] = useState(0);
  const [sweetPrice, setSweetPrice] = useState(0.00015); // fallback price

  // Fetch real TON balance when wallet connects
  useEffect(() => {
    if (!wallet?.account.address) return;
    EcosystemService.getBalance(wallet.account.address).then((bal) => {
      setTonBalance(bal.ton);
    });
  }, [wallet?.account.address]);

  // Fetch live SWEET price from DeDust API
  useEffect(() => {
    fetch('https://api.dedust.io/v2/pools')
      .then((r) => r.json())
      .then((pools: { assets: { address?: string }[]; price?: number }[]) => {
        const pool = pools?.find((p) =>
          p.assets?.some((a) => a.address?.toLowerCase().includes('4d3a2278'))
        );
        if (pool?.price && pool.price > 0) setSweetPrice(pool.price);
      })
      .catch(() => {}); // fallback to hardcoded price
  }, []);

  const balances = { TON: tonBalance, SWEET: sweetBalance };
  const TON_PRICE_USD = 5.24; // approximate

  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPayAmount(val);
    if (!val || isNaN(Number(val))) { setReceiveAmount(''); return; }
    const num = Number(val);
    setReceiveAmount(
      direction === 'TON_TO_SWEET'
        ? (num / sweetPrice).toFixed(2)
        : (num * sweetPrice).toFixed(6)
    );
  };

  const handleFlip = () => {
    setDirection((d) => (d === 'TON_TO_SWEET' ? 'SWEET_TO_TON' : 'TON_TO_SWEET'));
    setPayAmount(receiveAmount);
    setReceiveAmount(payAmount);
  };

  const handleMax = () => {
    if (direction === 'TON_TO_SWEET') {
      const max = Math.max(0, balances.TON - 0.05).toFixed(4);
      setPayAmount(max);
      setReceiveAmount((Number(max) / sweetPrice).toFixed(2));
    } else {
      setPayAmount(balances.SWEET.toString());
      setReceiveAmount((balances.SWEET * sweetPrice).toFixed(6));
    }
  };

  const handleSwap = () => {
    if (!wallet) { tonConnectUI.openModal(); return; }
    const amount = Number(payAmount);
    if (amount <= 0) { toast.error(t('swap.invalidAmount') || 'Enter a valid amount'); return; }

    // Build DeDust URL with amount pre-filled
    const url = direction === 'TON_TO_SWEET'
      ? `${DEDUST_SWAP_URL}?amount=${amount}`
      : `https://dedust.io/swap/${SWEET_JETTON_ADDRESS}/TON?amount=${amount}`;

    toast.success('Opening DeDust DEX to complete your swap...', { duration: 3000, icon: '🔄' });
    window.open(url, '_blank');
  };

  const payToken = direction === 'TON_TO_SWEET' ? 'TON' : 'SWEET';
  const receiveToken = direction === 'TON_TO_SWEET' ? 'SWEET' : 'TON';

  const getUsdValue = (amountStr: string, token: 'TON' | 'SWEET') => {
    if (!amountStr || isNaN(Number(amountStr))) return '0.00';
    return token === 'TON'
      ? (Number(amountStr) * TON_PRICE_USD).toFixed(2)
      : (Number(amountStr) * sweetPrice * TON_PRICE_USD).toFixed(4);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 text-white flex flex-col items-center pt-10 md:pt-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6 px-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-6 h-6" />
              {t('swap.title')}
            </h1>
            <p className="text-sm text-stone-500 mt-1">{t('swap.subtitle')}</p>
          </div>
          <a
            href={DEDUST_SWAP_URL}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Open DeDust DEX"
          >
            <Cog8ToothIcon className="w-5 h-5 text-stone-400" />
          </a>
        </div>

        {/* DeDust badge */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs text-stone-500">Powered by</span>
          <a
            href={DEDUST_SWAP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-700 text-xs font-semibold text-stone-300 hover:border-stone-500 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            DeDust DEX
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        </div>

        <GlassCard className="!p-1">
          <div className="bg-black/40 rounded-3xl p-4">

            {/* Pay Section */}
            <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 mb-1 hover:border-white/10 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-stone-500 font-medium">{t('swap.youPay')}</span>
                <span className="text-xs text-stone-500 font-mono">
                  {t('swap.balance')}: {balances[payToken].toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  placeholder="0.0"
                  value={payAmount}
                  onChange={handlePayChange}
                  className="bg-transparent text-3xl font-mono text-white focus:outline-none w-full placeholder:text-stone-700"
                />
                <button className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                  {payToken === 'TON' ? (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-white/10 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="font-bold">{payToken}</span>
                  <ChevronDownIcon className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 h-6">
                <span className="text-xs text-stone-500 font-mono">${getUsdValue(payAmount, payToken)}</span>
                <button
                  onClick={handleMax}
                  className="text-[10px] font-bold tracking-wider uppercase text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded bg-purple-500/10"
                >
                  {t('swap.max')}
                </button>
              </div>
            </div>

            {/* Flip Button */}
            <div className="relative h-2 flex justify-center items-center z-10">
              <button
                onClick={handleFlip}
                className="absolute bg-stone-900 border-4 border-[#0f0f11] p-1.5 rounded-xl hover:bg-stone-800 transition-colors"
              >
                <ArrowsRightLeftIcon className="w-4 h-4 text-white rotate-90" />
              </button>
            </div>

            {/* Receive Section */}
            <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 mt-1 hover:border-white/10 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-stone-500 font-medium">{t('swap.youReceive')}</span>
                <span className="text-xs text-stone-500 font-mono">
                  {t('swap.balance')}: {balances[receiveToken].toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  placeholder="0.0"
                  value={receiveAmount}
                  readOnly
                  className="bg-transparent text-3xl font-mono text-stone-300 focus:outline-none w-full placeholder:text-stone-700"
                />
                <button className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                  {receiveToken === 'TON' ? (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-white/10 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="font-bold">{receiveToken}</span>
                  <ChevronDownIcon className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              <div className="flex justify-between mt-2 h-6">
                <span className="text-xs text-stone-500 font-mono">${getUsdValue(receiveAmount, receiveToken)}</span>
              </div>
            </div>

            {/* Price Info */}
            <AnimatePresence>
              {payAmount && Number(payAmount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-4 px-2"
                >
                  <div className="flex justify-between items-center text-xs text-stone-500 py-1">
                    <span className="flex items-center gap-1">
                      {t('swap.rate')} <InformationCircleIcon className="w-3 h-3" />
                    </span>
                    <span className="font-mono">1 SWEET = {sweetPrice} TON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-stone-500 py-1">
                    <span>{t('swap.networkFee')}</span>
                    <span className="font-mono">~0.01 TON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-stone-500 py-1">
                    <span>{t('swap.priceImpact')}</span>
                    <span className="text-green-400">&lt; 0.1%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-stone-500 py-1 border-t border-stone-800/60 pt-2 mt-1">
                    <span>DEX</span>
                    <a
                      href={DEDUST_SWAP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      DeDust Protocol <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <button
              onClick={handleSwap}
              disabled={!payAmount || Number(payAmount) <= 0}
              className={`w-full mt-4 py-4 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]
                ${!wallet
                  ? 'bg-purple-500 hover:bg-purple-400 text-white'
                  : (!payAmount || Number(payAmount) <= 0)
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-amber-500 text-black hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                }`}
            >
              {!wallet
                ? t('swap.connectWallet')
                : (!payAmount || Number(payAmount) <= 0)
                ? t('swap.swapbtn')
                : (
                  <span className="flex items-center justify-center gap-2">
                    {t('swap.swapbtn')} via DeDust
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </span>
                )
              }
            </button>

            <p className="text-center text-[10px] text-stone-600 mt-3">
              Swap executes on DeDust DEX — a non-custodial TON protocol
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
