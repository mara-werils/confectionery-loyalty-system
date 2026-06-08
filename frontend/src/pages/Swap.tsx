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

  const isSwapDisabled = !payAmount || Number(payAmount) <= 0;

  return (
    <div
      className="min-h-screen p-4 md:p-8 pb-32 flex flex-col items-center pt-10 md:pt-20"
      style={{ color: 'var(--sweet-text)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-between items-center mb-6 px-1"
        >
          <div>
            <h1
              className="text-2xl font-bold tracking-tight flex items-center gap-2"
              style={{ color: 'var(--sweet-text)' }}
            >
              <ArrowsRightLeftIcon className="w-6 h-6" style={{ color: 'var(--sweet-accent)' }} />
              {t('swap.title')}
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {t('swap.subtitle')}
            </p>
          </div>
          <a
            href={DEDUST_SWAP_URL}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--sweet-text-secondary)' }}
            title="Open DeDust DEX"
          >
            <Cog8ToothIcon className="w-5 h-5" />
          </a>
        </motion.div>

        {/* DeDust badge */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between mb-4 px-1"
        >
          <span
            className="text-xs"
            style={{ color: 'var(--sweet-text-muted)' }}
          >
            Powered by
          </span>
          <a
            href={DEDUST_SWAP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
              color: 'var(--sweet-text-secondary)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            DeDust DEX
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        </motion.div>

        {/* Main swap card — keep GlassCard import, override bg via inline style wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard className="!p-1" hoverable={false}>
            {/* Inner panel */}
            <div
              className="rounded-3xl p-4"
              style={{ background: 'var(--sweet-card)' }}
            >

              {/* Pay Section */}
              <div
                className="rounded-2xl p-4 mb-1 transition-colors"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <div className="flex justify-between mb-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('swap.youPay')}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('swap.balance')}: {balances[payToken].toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={payAmount}
                    onChange={handlePayChange}
                    className="bg-transparent text-3xl font-mono focus:outline-none w-full"
                    style={{
                      color: 'var(--sweet-text)',
                      caretColor: 'var(--sweet-accent)',
                    }}
                  />
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                    style={{
                      background: 'var(--sweet-card)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                  >
                    {payToken === 'TON' ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--sweet-card-hover)', border: '1px solid var(--sweet-border)' }}
                      >
                        <CurrencyDollarIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
                      </div>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          background: 'var(--sweet-accent-dim)',
                          border: '1px solid var(--sweet-border)',
                        }}
                      >
                        <SparklesIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
                      </div>
                    )}
                    <span className="font-bold text-sm">{payToken}</span>
                    <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 h-6">
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    ${getUsdValue(payAmount, payToken)}
                  </span>
                  <button
                    onClick={handleMax}
                    className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                    style={{
                      color: 'var(--sweet-accent)',
                      background: 'var(--sweet-accent-dim)',
                    }}
                  >
                    {t('swap.max')}
                  </button>
                </div>
              </div>

              {/* Flip Button */}
              <div className="relative h-2 flex justify-center items-center z-10">
                <motion.button
                  onClick={handleFlip}
                  whileTap={{ rotate: 180, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  className="absolute p-1.5 rounded-xl transition-colors"
                  style={{
                    background: 'var(--sweet-card-hover)',
                    border: `4px solid var(--sweet-card)`,
                    color: 'var(--sweet-text)',
                  }}
                >
                  <ArrowsRightLeftIcon className="w-4 h-4 rotate-90" />
                </motion.button>
              </div>

              {/* Receive Section */}
              <div
                className="rounded-2xl p-4 mt-1 transition-colors"
                style={{
                  background: 'var(--sweet-input)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <div className="flex justify-between mb-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('swap.youReceive')}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('swap.balance')}: {balances[receiveToken].toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={receiveAmount}
                    readOnly
                    className="bg-transparent text-3xl font-mono focus:outline-none w-full"
                    style={{ color: 'var(--sweet-text-secondary)' }}
                  />
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                    style={{
                      background: 'var(--sweet-card)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                  >
                    {receiveToken === 'TON' ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--sweet-card-hover)', border: '1px solid var(--sweet-border)' }}
                      >
                        <CurrencyDollarIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-secondary)' }} />
                      </div>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          background: 'var(--sweet-accent-dim)',
                          border: '1px solid var(--sweet-border)',
                        }}
                      >
                        <SparklesIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
                      </div>
                    )}
                    <span className="font-bold text-sm">{receiveToken}</span>
                    <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
                  </button>
                </div>
                <div className="flex justify-between mt-2 h-6">
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    ${getUsdValue(receiveAmount, receiveToken)}
                  </span>
                </div>
              </div>

              {/* Price Info */}
              <AnimatePresence>
                {payAmount && Number(payAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-4 px-1"
                  >
                    <div
                      className="rounded-xl px-3 py-2 space-y-0.5"
                      style={{
                        background: 'var(--sweet-input)',
                        border: '1px solid var(--sweet-border)',
                      }}
                    >
                      <div
                        className="flex justify-between items-center text-xs py-1"
                        style={{ color: 'var(--sweet-text-muted)' }}
                      >
                        <span className="flex items-center gap-1">
                          {t('swap.rate')} <InformationCircleIcon className="w-3 h-3" />
                        </span>
                        <span className="font-mono">1 SWEET = {sweetPrice} TON</span>
                      </div>
                      <div
                        className="flex justify-between items-center text-xs py-1"
                        style={{ color: 'var(--sweet-text-muted)' }}
                      >
                        <span>{t('swap.networkFee')}</span>
                        <span className="font-mono">~0.01 TON</span>
                      </div>
                      <div
                        className="flex justify-between items-center text-xs py-1"
                        style={{ color: 'var(--sweet-text-muted)' }}
                      >
                        <span>{t('swap.priceImpact')}</span>
                        <span className="text-green-400">&lt; 0.1%</span>
                      </div>
                      <div
                        className="flex justify-between items-center text-xs py-1 mt-1 pt-2"
                        style={{
                          color: 'var(--sweet-text-muted)',
                          borderTop: '1px solid var(--sweet-border)',
                        }}
                      >
                        <span>DEX</span>
                        <a
                          href={DEDUST_SWAP_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--sweet-accent)' }}
                        >
                          DeDust Protocol <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <motion.button
                onClick={handleSwap}
                disabled={isSwapDisabled && !!wallet}
                whileTap={!isSwapDisabled || !wallet ? { scale: 0.97 } : {}}
                className="w-full mt-4 py-4 rounded-xl font-bold tracking-wide transition-all"
                style={
                  !wallet
                    ? {
                        background: '#f59e0b',
                        color: '#000',
                        boxShadow: '0 0 24px rgba(245,158,11,0.2)',
                      }
                    : isSwapDisabled
                    ? {
                        background: 'var(--sweet-card-hover)',
                        color: 'var(--sweet-text-faint)',
                        cursor: 'not-allowed',
                        border: '1px solid var(--sweet-border)',
                      }
                    : {
                        background: '#f59e0b',
                        color: '#000',
                        boxShadow: '0 0 28px rgba(245,158,11,0.25)',
                      }
                }
              >
                {!wallet
                  ? t('swap.connectWallet')
                  : isSwapDisabled
                  ? t('swap.swapbtn')
                  : (
                    <span className="flex items-center justify-center gap-2">
                      {t('swap.swapbtn')} via DeDust
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </span>
                  )
                }
              </motion.button>

              <p
                className="text-center text-[10px] mt-3"
                style={{ color: 'var(--sweet-text-faint)' }}
              >
                Swap executes on DeDust DEX — a non-custodial TON protocol
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
