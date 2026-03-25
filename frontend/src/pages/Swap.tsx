import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import {
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/GlassCard';

// Dummy price data for MVP
const SWEET_PRICE_TON = 0.00015;
const TON_PRICE_USD = 5.24;

export default function Swap() {
  const { t } = useTranslation();
  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [direction, setDirection] = useState<'TON_TO_SWEET' | 'SWEET_TO_TON'>('TON_TO_SWEET');
  
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  // Mock balances
  const [balances] = useState({
    TON: 14.5,
    SWEET: 15420
  });

  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPayAmount(val);
    
    if (!val || isNaN(Number(val))) {
      setReceiveAmount('');
      return;
    }

    // Calculate conversion
    const numVal = Number(val);
    if (direction === 'TON_TO_SWEET') {
      const sweetReceived = numVal / SWEET_PRICE_TON;
      setReceiveAmount(sweetReceived.toFixed(2));
    } else {
      const tonReceived = numVal * SWEET_PRICE_TON;
      setReceiveAmount(tonReceived.toFixed(4));
    }
  };

  const handleFlip = () => {
    setDirection(prev => prev === 'TON_TO_SWEET' ? 'SWEET_TO_TON' : 'TON_TO_SWEET');
    // Swap the inputs
    setPayAmount(receiveAmount);
    setReceiveAmount(payAmount);
  };

  const handleMax = () => {
    if (direction === 'TON_TO_SWEET') {
      // Leave gas buffer
      const maxTon = Math.max(0, balances.TON - 0.05);
      setPayAmount(maxTon.toString());
      setReceiveAmount((maxTon / SWEET_PRICE_TON).toFixed(2));
    } else {
      setPayAmount(balances.SWEET.toString());
      setReceiveAmount((balances.SWEET * SWEET_PRICE_TON).toFixed(4));
    }
  };

  const handleSwap = async () => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }
    
    const amount = Number(payAmount);
    if (amount <= 0) {
      toast.error(t('swap.invalidAmount') || 'Enter a valid amount');
      return;
    }

    if (direction === 'TON_TO_SWEET' && amount > balances.TON) {
      toast.error(t('swap.insufficientTon') || 'Insufficient TON balance');
      return;
    }
    
    if (direction === 'SWEET_TO_TON' && amount > balances.SWEET) {
      toast.error(t('swap.insufficientSweet') || 'Insufficient SWEET balance');
      return;
    }

    setIsSwapping(true);
    
    toast.loading(t('swap.routing') || 'Routing trade through DeDust...', { id: 'swap' });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast.success(t('swap.success') || 'Swap successful! Tokens transferred to your wallet.', { id: 'swap' });
    setIsSwapping(false);
    setPayAmount('');
    setReceiveAmount('');
  };

  const payToken = direction === 'TON_TO_SWEET' ? 'TON' : 'SWEET';
  const receiveToken = direction === 'TON_TO_SWEET' ? 'SWEET' : 'TON';
  
  const getUsdValue = (amountStr: string, token: 'TON' | 'SWEET') => {
    if (!amountStr || isNaN(Number(amountStr))) return '0.00';
    const amount = Number(amountStr);
    
    if (token === 'TON') {
        return (amount * TON_PRICE_USD).toFixed(2);
    } else {
        return (amount * SWEET_PRICE_TON * TON_PRICE_USD).toFixed(2);
    }
  };

  // UI rendering
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
                <p className="text-sm text-zinc-500 mt-1">{t('swap.subtitle')}</p>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={() => toast.success(t('swap.settings') || 'Slippage settings')}>
                <Cog8ToothIcon className="w-5 h-5 text-zinc-400" />
            </button>
        </div>

        <GlassCard className="!p-1">
          <div className="bg-black/40 rounded-3xl p-4">
              
            {/* Pay Section */}
            <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 mb-1 transition-colors hover:border-white/10 relative">
                <div className="flex justify-between mb-2">
                    <span className="text-xs text-zinc-500 font-medium">{t('swap.youPay')}</span>
                    <span className="text-xs text-zinc-500 font-mono">
                        {t('swap.balance')}: {balances[payToken].toLocaleString()}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <input 
                        type="number"
                        placeholder="0.0"
                        value={payAmount}
                        onChange={handlePayChange}
                        className="bg-transparent text-3xl font-mono text-white focus:outline-none w-full placeholder:text-zinc-700"
                    />
                    
                    <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                        {payToken === 'TON' ? (
                             <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-4 h-4 text-white" />
                             </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center">
                                <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="font-bold">{payToken}</span>
                        <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
                
                <div className="flex justify-between items-center mt-2 h-6">
                    <span className="text-xs text-zinc-500 font-mono">
                        ${getUsdValue(payAmount, payToken)}
                    </span>
                    <button onClick={handleMax} className="text-[10px] font-bold tracking-wider uppercase text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded bg-purple-500/10">
                        {t('swap.max')}
                    </button>
                </div>
            </div>

            {/* Flip Button */}
            <div className="relative h-2 flex justify-center items-center z-10">
                <button 
                  onClick={handleFlip}
                  className="absolute bg-zinc-900 border-4 border-[#0f0f11] p-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                    <ArrowsRightLeftIcon className="w-4 h-4 text-white rotate-90" />
                </button>
            </div>

            {/* Receive Section */}
            <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 mt-1 transition-colors hover:border-white/10">
                <div className="flex justify-between mb-2">
                    <span className="text-xs text-zinc-500 font-medium">{t('swap.youReceive')}</span>
                    <span className="text-xs text-zinc-500 font-mono">
                        {t('swap.balance')}: {balances[receiveToken].toLocaleString()}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                     <input 
                        type="number"
                        placeholder="0.0"
                        value={receiveAmount}
                        readOnly
                        className="bg-transparent text-3xl font-mono text-zinc-300 focus:outline-none w-full placeholder:text-zinc-700"
                    />
                    
                     <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                        {receiveToken === 'TON' ? (
                             <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-4 h-4 text-white" />
                             </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center">
                                <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="font-bold">{receiveToken}</span>
                        <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                <div className="flex justify-between mt-2 h-6">
                    <span className="text-xs text-zinc-500 font-mono">
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
                        className="overflow-hidden mt-4 px-2"
                    >
                        <div className="flex justify-between items-center text-xs text-zinc-500 py-1">
                            <span className="flex items-center gap-1">{t('swap.rate')} <InformationCircleIcon className="w-3 h-3" /></span>
                            <span className="font-mono">1 SWEET = {SWEET_PRICE_TON} TON</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-zinc-500 py-1">
                            <span>{t('swap.networkFee')}</span>
                            <span className="font-mono">~0.01 TON</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-zinc-500 py-1">
                            <span>{t('swap.priceImpact')}</span>
                            <span className="text-green-400">&lt; 0.1%</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Button */}
            <button
              onClick={handleSwap}
              disabled={isSwapping || (!wallet ? true : false) || (!payAmount || Number(payAmount) <= 0)}
              className={`w-full mt-4 py-4 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]
                ${!wallet ? 'bg-purple-500 hover:bg-purple-400 text-white' : 
                  isSwapping ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                  (!payAmount || Number(payAmount) <= 0) ? 'bg-white/10 text-white/40 cursor-not-allowed' : 
                  'bg-white text-black hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]'}`}
            >
              {!wallet ? t('swap.connectWallet') : isSwapping ? t('swap.swapping') : t('swap.swapbtn')}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
