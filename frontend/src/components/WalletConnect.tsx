import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { WalletIcon } from '@heroicons/react/24/outline';

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
        className={`flex items-center gap-3 px-4 py-3 bg-success-50 border-2 border-success-200 rounded-2xl ${className}`}
      >
        <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-success-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-success-600 font-medium">Connected</p>
          <p className="text-sm font-semibold text-success-800">
            {formatAddress(wallet.account.address)}
          </p>
        </div>
        <button
          onClick={() => tonConnectUI.disconnect()}
          className="text-xs text-success-600 hover:text-success-800 font-medium"
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




