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
      case 'active': return <CheckCircleIcon style={{ width: 14, height: 14, color: '#34d399' }} />;
      case 'uninitialized': return <BeakerIcon style={{ width: 14, height: 14, color: '#fbbf24' }} />;
      default: return <XCircleIcon style={{ width: 14, height: 14, color: '#f87171' }} />;
    }
  };

  const getStatusBadgeStyle = (state: string): React.CSSProperties => {
    switch (state) {
      case 'active':
        return {
          color: '#34d399',
          background: 'rgba(52,211,153,0.10)',
          border: '1px solid rgba(52,211,153,0.22)',
        };
      case 'uninitialized':
        return {
          color: '#fbbf24',
          background: 'rgba(251,191,36,0.10)',
          border: '1px solid rgba(251,191,36,0.22)',
        };
      default:
        return {
          color: '#f87171',
          background: 'rgba(248,113,113,0.10)',
          border: '1px solid rgba(248,113,113,0.22)',
        };
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.15 + i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const sectionLabel = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--sweet-accent)', flexShrink: 0 }} />
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sweet-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        {text}
      </span>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sweet-bg)',
        padding: '16px 16px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Header ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          borderBottom: '1px solid var(--sweet-border)',
          paddingBottom: '20px',
          paddingTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--sweet-text)',
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {t('blockchain.title') || 'Smart Contracts Observer'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--sweet-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
            API Node:
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                background: 'var(--sweet-input)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--sweet-border)',
                color: 'var(--sweet-text-secondary)',
              }}
            >
              testnet.toncenter.com
            </span>
          </p>
        </div>

        {/* Connection status pill */}
        <div>
          {loading ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'var(--sweet-input)',
                border: '1px solid var(--sweet-border)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--sweet-text-muted)',
              }}
            >
              Syncing...
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </span>
          ) : Object.values(contractStates).some(s => s?.state === 'active') ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.20)',
                fontSize: '12px',
                fontWeight: 500,
                color: '#34d399',
              }}
            >
              {t('blockchain.connected') || 'Node Connected'}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.20)',
                fontSize: '12px',
                fontWeight: 500,
                color: '#f87171',
              }}
            >
              Node Unreachable
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Overview grid ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

        {/* Network Overview card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--sweet-accent), transparent)',
              opacity: 0.25,
            }}
          />
          {sectionLabel(t('blockchain.networkStatus') || 'Current Ledger Status')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--sweet-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', margin: '0 0 4px' }}>State</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sweet-text)', margin: 0 }}>{t('blockchain.operational') || 'Operational'}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--sweet-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', margin: '0 0 6px' }}>
                Connected Wallet Configuration
              </p>
              {wallet ? (
                <p
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--sweet-text-secondary)',
                    background: 'var(--sweet-input)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--sweet-border)',
                    margin: 0,
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  {wallet.account.address}
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: '#fbbf24', margin: 0 }}>{t('blockchain.walletNotConnected') || 'Not Authenticated'}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Jetton Data card */}
        {tokenData ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, var(--sweet-accent), transparent)',
                opacity: 0.25,
              }}
            />
            {sectionLabel(t('blockchain.jettonState') || 'Loyalty Jetton Parameters')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--sweet-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                  {t('blockchain.totalSupply') || 'Max Supply'}
                </p>
                <p style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--sweet-text)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {tokenData.totalSupply}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--sweet-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                  {t('blockchain.mintable') || 'Mintable'}
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sweet-text)', margin: '4px 0 0' }}>
                  {tokenData.mintable ? t('blockchain.yes') : t('blockchain.no')}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '10px', color: 'var(--sweet-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                  {t('blockchain.adminAddress') || 'Owner / Admin'}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: 'var(--sweet-text-secondary)',
                    background: 'var(--sweet-input)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--sweet-border)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tokenData.adminAddress}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17, duration: 0.38 }}
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px',
            }}
          >
            <div className="skeleton" style={{ height: 28, width: 100, borderRadius: '8px' }} />
          </motion.div>
        )}
      </div>

      {/* ── Deployed Smart Contracts ──────────── */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              background: 'var(--sweet-accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CodeBracketSquareIcon style={{ width: 16, height: 16, color: 'var(--sweet-accent)' }} />
          </div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--sweet-text)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {t('blockchain.deployedContracts') || 'Deployed Smart Contracts'}
          </h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                style={{
                  background: 'var(--sweet-card)',
                  border: '1px solid var(--sweet-border)',
                  borderRadius: '16px',
                  padding: '18px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent shimmer line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '15%',
                    right: '15%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, var(--sweet-accent), transparent)',
                    opacity: 0.2,
                  }}
                />

                {/* Card header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--sweet-border)',
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--sweet-text)', margin: '0 0 3px' }}>
                      {nameMap[key]}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--sweet-text-faint)', fontFamily: 'monospace', margin: 0 }}>
                      {key}.fc
                    </p>
                  </div>

                  {isLoading ? (
                    <div className="skeleton" style={{ height: 24, width: 70, borderRadius: '8px' }} />
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 500,
                        ...getStatusBadgeStyle(state.state),
                      }}
                    >
                      {getStatusIcon(state.state)}
                      <span style={{ textTransform: 'capitalize' }}>{state.state}</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p
                      style={{
                        fontSize: '10px',
                        color: 'var(--sweet-text-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        margin: '0 0 6px',
                      }}
                    >
                      {t('blockchain.contractAddress') || 'Compiled Hash Address'}
                    </p>
                    <p
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: 'var(--sweet-text-secondary)',
                        background: 'var(--sweet-input)',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--sweet-border)',
                        wordBreak: 'break-all',
                        margin: '0 0 10px',
                        lineHeight: 1.5,
                      }}
                    >
                      {address}
                    </p>

                    {/* Explorer buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`https://testnet.tonscan.org/address/${address}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--sweet-input)',
                          border: '1px solid var(--sweet-border)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--sweet-text-secondary)',
                          textDecoration: 'none',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--sweet-card-hover)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--sweet-text)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--sweet-input)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--sweet-text-secondary)';
                        }}
                      >
                        <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                        Tonscan
                      </a>
                      <a
                        href={`https://testnet.tonviewer.com/${address}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--sweet-input)',
                          border: '1px solid var(--sweet-border)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--sweet-text-secondary)',
                          textDecoration: 'none',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--sweet-card-hover)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--sweet-text)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--sweet-input)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--sweet-text-secondary)';
                        }}
                      >
                        <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                        Tonviewer
                      </a>
                    </div>
                  </div>

                  <div>
                    <p
                      style={{
                        fontSize: '10px',
                        color: 'var(--sweet-text-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        margin: '0 0 6px',
                      }}
                    >
                      {t('blockchain.tonBalance') || 'Locked TON Balance'}
                    </p>
                    {isLoading ? (
                      <div className="skeleton" style={{ height: 20, width: 80, borderRadius: '6px' }} />
                    ) : (
                      <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: 'var(--sweet-text)', margin: 0 }}>
                        {state.balance}{' '}
                        <span style={{ color: 'var(--sweet-text-faint)', fontWeight: 400, fontSize: '12px' }}>TON</span>
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
