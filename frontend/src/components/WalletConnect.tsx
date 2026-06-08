import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { WalletIcon } from '@phosphor-icons/react';

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className }: WalletConnectProps) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (wallet) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 px-4 py-3 bg-stone-900/50 border border-white/10 rounded-2xl shadow-inner ${className}`}
      >
        <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-green-400 font-medium">Connected</p>
          <p className="text-sm font-mono text-white mt-0.5">
            {formatAddress(wallet.account.address)}
          </p>
        </div>
        <button
          onClick={() => tonConnectUI.disconnect()}
          className="text-xs text-stone-400 hover:text-white font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
        >
          Disconnect
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={className}
    >
      <TonConnectButton className="ton-connect-button" />
    </motion.div>
  );
}




