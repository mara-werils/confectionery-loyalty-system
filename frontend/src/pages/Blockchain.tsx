import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/GlassCard';
import { BlockchainService, CONTRACT_ADDRESSES, ContractState } from '../services/ton';
import { useTonWallet } from '@tonconnect/ui-react';
import { ArrowsRightLeftIcon, CodeBracketSquareIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Blockchain() {
  const wallet = useTonWallet();
  const [contractStates, setContractStates] = useState<Record<string, ContractState>>({});
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockchainData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBlockchainData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBlockchainData = async () => {
    try {
      const [states, tData] = await Promise.all([
        BlockchainService.getAllContractsState(),
        BlockchainService.getLoyaltyTokenData()
      ]);
      setContractStates(states);
      setTokenData(tData);
    } catch (err) {
      console.error('Failed to load blockchain data', err);
      toast.error('Failed to sync with TON blockchain');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-500';
      case 'uninitialized': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 pb-32 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-400 to-green-500">
            Blockchain
          </span>
          <span className="ml-2">Live</span>
        </h1>
        <p className="text-zinc-400 text-lg flex items-center justify-center gap-2 mt-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Connected to TON Testnet
        </p>
      </motion.div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard delay={0.1}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-zinc-400 font-medium tracking-tight">Network Status</h3>
              <p className="text-2xl font-bold mt-1 text-white">Operational</p>
              <p className="text-sm text-zinc-500 mt-2 font-mono">API: testnet.toncenter.com</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <CubeTransparentIcon className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.2}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-zinc-400 font-medium tracking-tight">Your Wallet</h3>
              {wallet ? (
                <>
                  <p className="text-xl font-bold mt-1 font-mono text-white bg-black/20 px-2 py-1 rounded inline-block">
                    {truncateAddress(wallet.account.address)}
                  </p>
                  <p className="text-sm text-green-400 mt-2 font-medium">Connected</p>
                </>
              ) : (
                <p className="text-xl font-bold mt-1 text-yellow-500">Not Connected</p>
              )}
            </div>
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <ArrowsRightLeftIcon className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Jetton Data Showcase */}
      {tokenData && (
        <GlassCard delay={0.3} className="border border-green-500/30 bg-green-900/10">
          <div className="flex items-center gap-3 mb-4">
            <CodeBracketSquareIcon className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold">Loyalty Token (Jetton) State</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
              <p className="text-sm text-gray-400">Total Supply</p>
              <p className="text-xl font-bold font-mono text-white">{tokenData.totalSupply}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
              <p className="text-sm text-gray-400">Mintable</p>
              <p className="text-xl font-bold font-mono text-white">{tokenData.mintable ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 col-span-2">
              <p className="text-sm text-gray-400">Admin Address</p>
              <p className="text-xl font-bold font-mono text-white truncate">{tokenData.adminAddress}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 italic">
            * Data live-fetched directly from the smart contract via get_jetton_data() method
          </p>
        </GlassCard>
      )}

      {/* Smart Contracts Status */}
      <h2 className="text-2xl font-bold mt-8 mb-4 px-2">Deployed Contracts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(CONTRACT_ADDRESSES).map(([key, address], index) => {
          const state = contractStates[key];
          const isLoading = loading && !state;
          const nameMap: Record<string, string> = {
            loyaltyToken: 'Loyalty Token (Jetton Master)',
            partnerRegistry: 'Partner Registry',
            redemptionManager: 'Redemption Manager',
            revenueDistribution: 'Revenue Distribution',
          };

          return (
            <motion.div
              key={key}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                <CubeTransparentIcon className="w-24 h-24" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{nameMap[key]}</h3>
                  {isLoading ? (
                    <div className="animate-pulse bg-zinc-700 h-6 w-16 rounded-full" />
                  ) : (
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-white/5">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(state.state)}`} />
                      <span className="text-xs uppercase font-bold text-zinc-300">{state.state}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Contract Address</p>
                    <a 
                      href={`https://testnet.tonscan.org/address/${address}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-mono text-sm text-zinc-300 hover:text-white transition-colors block break-all"
                    >
                      {address}
                    </a>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">TON Balance</p>
                      {isLoading ? (
                        <div className="animate-pulse bg-zinc-700 h-6 w-24 rounded" />
                      ) : (
                        <p className="font-mono font-bold text-white">
                          {state.balance} <span className="text-zinc-500">TON</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
