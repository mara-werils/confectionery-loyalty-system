import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BlockchainService, CONTRACT_ADDRESSES, ContractState } from '../services/ton';
import { useTonWallet } from '@tonconnect/ui-react';
import { CodeBracketSquareIcon, CheckCircleIcon, XCircleIcon, BeakerIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function Blockchain() {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const [contractStates, setContractStates] = useState<Record<string, ContractState>>({});
  const [tokenData, setTokenData] = useState<{ name?: string; symbol?: string; balance?: string; decimals?: number; totalSupply?: number; mintable?: boolean; adminAddress?: string; address?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockchainData();
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
      toast.error(t('blockchain.syncError') || 'Failed to sync with TON node');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'active': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'uninitialized': return <BeakerIcon className="w-4 h-4 text-yellow-500" />;
      default: return <XCircleIcon className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 pb-32 text-zinc-100 font-sans bg-[#09090b]">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t('blockchain.title') || 'Smart Contracts Observer'}
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm flex items-center gap-2">
            API Node: <span className="font-mono text-xs bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">testnet.toncenter.com</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-500">
              Syncing...
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            </span>
          ) : Object.values(contractStates).some(s => s?.state === 'active') ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
              {t('blockchain.connected') || 'Node Connected'}
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-red-900/40 text-xs font-medium text-red-400">
              Node Unreachable
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Network Overview */}
         <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-400 mb-4 tracking-tight">{t('blockchain.networkStatus') || 'Current Ledger Status'}</h3>
            <div className="space-y-4">
               <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">State</p>
                  <p className="text-white font-medium">{t('blockchain.operational') || 'Operational'}</p>
               </div>
               <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Connected Wallet Configuration</p>
                  {wallet ? (
                     <p className="text-sm font-mono text-zinc-300 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800 block break-all">
                        {wallet.account.address}
                     </p>
                  ) : (
                     <p className="text-sm text-yellow-500/90">{t('blockchain.walletNotConnected') || 'Not Authenticated'}</p>
                  )}
               </div>
            </div>
         </div>

        {/* Jetton Data Showcase */}
        {tokenData ? (
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium text-zinc-400 tracking-tight">{t('blockchain.jettonState') || 'Loyalty Jetton Parameters'}</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('blockchain.totalSupply') || 'Max Supply'}</p>
                <p className="text-lg font-medium font-mono text-zinc-100">{tokenData.totalSupply}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('blockchain.mintable') || 'Mintable'}</p>
                <p className="text-sm font-medium text-zinc-100 mt-1">{tokenData.mintable ? t('blockchain.yes') : t('blockchain.no')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('blockchain.adminAddress') || 'Owner / Admin'}</p>
                <p className="text-sm border border-zinc-800 bg-zinc-950 font-mono py-2 px-3 rounded-lg text-zinc-300 truncate">
                  {tokenData.adminAddress}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-sm flex items-center justify-center min-h-[220px]">
            <div className="animate-pulse bg-zinc-800 h-8 w-24 rounded-md" />
          </div>
        )}
      </div>

      {/* Smart Contracts Grid */}
      <div>
         <h2 className="text-lg font-semibold mt-4 mb-4 text-white flex items-center gap-2">
            <CodeBracketSquareIcon className="w-5 h-5 text-zinc-500" />
            {t('blockchain.deployedContracts') || 'Deployed Smart Contracts'}
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(CONTRACT_ADDRESSES).map(([key, address], index) => {
               const state = contractStates[key];
               const isLoading = loading && !state;
               const nameMap: Record<string, string> = {
               loyaltyToken: t('blockchain.contracts.loyaltyToken') || 'Loyalty Token Root',
               partnerRegistry: t('blockchain.contracts.partnerRegistry') || 'Partner Master Registry',
               redemptionManager: t('blockchain.contracts.redemptionManager') || 'Redemption Vault',
               revenueDistribution: t('blockchain.contracts.revenueDistribution') || 'Treasury Distributor',
               };

               return (
               <motion.div
                  key={key}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm"
               >
                  <div className="flex justify-between items-start mb-4 border-b border-zinc-800/50 pb-4">
                     <div>
                        <h3 className="font-semibold text-zinc-100">{nameMap[key]}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5 font-mono">{key}.fc</p>
                     </div>
                     {isLoading ? (
                        <div className="animate-pulse bg-zinc-800 h-5 w-16 rounded-md" />
                     ) : (
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-xs text-zinc-300">
                           {getStatusIcon(state.state)}
                           <span className="capitalize">{state.state}</span>
                        </div>
                     )}
                  </div>

                  <div className="space-y-4">
                     <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">{t('blockchain.contractAddress') || 'Compiled Hash Address'}</p>
                        <p className="font-mono text-xs text-zinc-300 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800 break-all mb-2">
                          {address}
                        </p>
                        <div className="flex gap-2">
                          <a
                            href={`https://testnet.tonscan.org/address/${address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                          >
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                            Tonscan
                          </a>
                          <a
                            href={`https://testnet.tonviewer.com/${address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                          >
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                            Tonviewer
                          </a>
                        </div>
                     </div>

                     <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">{t('blockchain.tonBalance') || 'Locked TON Balance'}</p>
                        {isLoading ? (
                        <div className="animate-pulse bg-zinc-800 h-5 w-20 rounded-md" />
                        ) : (
                        <p className="font-mono text-sm text-zinc-200">
                           {state.balance} <span className="text-zinc-500">TON</span>
                        </p>
                        )}
                     </div>
                  </div>
               </motion.div>
               );
            })}
         </div>
      </div>
    </div>
  );
}
