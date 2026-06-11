import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { config } from '../config';
import { tonClient } from './ton';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryFn<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { status: number }; message?: string };
      if (e?.response?.status === 429 || e?.message?.includes('429')) {
        logger.warn(`[Revenue] Rate limited, retrying in ${delayMs / 1000}s (${i + 1}/${retries})`);
        await sleep(delayMs);
        delayMs *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error('[Revenue] Max retries exceeded');
}

async function getAdminWallet() {
  if (!config.ton.adminMnemonic) throw new Error('ADMIN_MNEMONIC not configured');
  const mnemonic = config.ton.adminMnemonic.split(' ');
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const walletContract = tonClient.open(wallet);
  return { keyPair, wallet, walletContract };
}

function parsePartnerAddress(walletAddress: string): Address {
  return walletAddress.includes(':')
    ? Address.parseRaw(walletAddress)
    : Address.parse(walletAddress);
}

/**
 * Scale KZT amount → nanoTON for commission calculation.
 * 1 KZT = 0.01 TON base → so 1000 KZT → 10 TON base.
 * Bronze 3%: 0.3 TON per 1000 KZT purchase (4 purchases → 1.2 TON → claimable).
 */
function kztToCommissionBase(kztAmount: number): bigint {
  return BigInt(Math.round(kztAmount)) * BigInt(10_000_000);
}

function tierToNum(tier: string): number {
  if (tier === 'GOLD') return 3;
  if (tier === 'SILVER') return 2;
  return 1; // BRONZE
}

/** Commission rates matching the FunC contract constants (basis points). */
export const COMMISSION_RATES: Record<string, number> = {
  BRONZE: 300,  // 3%
  SILVER: 500,  // 5%
  GOLD: 700,    // 7%
};

export const MIN_PAYOUT_NANO = BigInt(1_000_000_000); // 1 TON
export const CONTRACT_ADDRESS = 'kQCSaOfJrZncDkbYD_bzSxEVksQzuC8JoAUDWXPffwhYu39w';

/**
 * Fire-and-forget: record a purchase transaction in the on-chain RevenueDistribution
 * contract so it accrues commission for the partner.
 */
export async function recordTransactionOnChain(
  partnerWallet: string,
  kztAmount: number,
  tier: string
): Promise<string | null> {
  const contractAddr = config.ton.contracts.revenueDistribution;
  if (!config.ton.adminMnemonic || !contractAddr) {
    logger.debug('[Revenue] recordTransaction skipped — no mnemonic/address configured');
    return null;
  }

  try {
    const { keyPair, walletContract } = await getAdminWallet();
    const seqno = await retryFn(() => walletContract.getSeqno());

    const partnerAddr = parsePartnerAddress(partnerWallet);
    const amountNano = kztToCommissionBase(kztAmount);
    const tierNum = tierToNum(tier);

    const payload = beginCell()
      .storeUint(0x20, 32)    // op::record_transaction
      .storeUint(0, 64)        // query_id
      .storeAddress(partnerAddr)
      .storeCoins(amountNano)
      .storeUint(tierNum, 8)
      .endCell();

    await retryFn(() =>
      walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(contractAddr),
            value: toNano('0.05'),
            body: payload,
          }),
        ],
      })
    );

    const txRef = `seqno:${seqno}`;
    logger.info(
      `[Revenue] recordTransaction on-chain: partner=${partnerWallet.slice(0, 8)}…, ` +
      `kzt=${kztAmount}, tier=${tier}, amountBase=${amountNano}n, seqno=${seqno}`
    );
    return txRef;
  } catch (err) {
    logger.error('[Revenue] recordTransaction on-chain failed:', err);
    return null;
  }
}

/**
 * Query the on-chain pending commission for a partner wallet address.
 * Returns nanoTON amount stored in the contract's pending_payouts dict.
 */
export async function getPendingCommissionOnChain(walletAddress: string): Promise<bigint> {
  const contractAddr = config.ton.contracts.revenueDistribution;
  if (!contractAddr) return 0n;

  try {
    const contractAddress = Address.parse(contractAddr);
    const partnerAddr = parsePartnerAddress(walletAddress);

    const result = await tonClient.runMethod(contractAddress, 'get_pending_payout', [
      { type: 'slice', cell: beginCell().storeAddress(partnerAddr).endCell() },
    ]);
    return result.stack.readBigNumber();
  } catch (err) {
    logger.error('[Revenue] getPendingCommission failed:', err);
    return 0n;
  }
}

/**
 * Query aggregate stats from the on-chain contract.
 */
export async function getContractStats(): Promise<{
  totalDistributed: bigint;
  platformBalance: bigint;
  payoutCount: bigint;
  contractBalance: bigint;
}> {
  const contractAddr = config.ton.contracts.revenueDistribution;
  if (!contractAddr) {
    return { totalDistributed: 0n, platformBalance: 0n, payoutCount: 0n, contractBalance: 0n };
  }

  try {
    const address = Address.parse(contractAddr);

    const [totalDistributed, platformBalance, payoutCount, contractBalance] = await Promise.all([
      tonClient.runMethod(address, 'get_total_distributed', []).then((r) => r.stack.readBigNumber()),
      tonClient.runMethod(address, 'get_platform_balance', []).then((r) => r.stack.readBigNumber()),
      tonClient.runMethod(address, 'get_payout_count', []).then((r) => r.stack.readBigNumber()),
      tonClient.getBalance(address),
    ]);

    return { totalDistributed, platformBalance, payoutCount, contractBalance };
  } catch (err) {
    logger.error('[Revenue] getContractStats failed:', err);
    return { totalDistributed: 0n, platformBalance: 0n, payoutCount: 0n, contractBalance: 0n };
  }
}

/**
 * Trigger on-chain payout for a partner. Verifies pending >= 1 TON first.
 * Records the payout in the DB and returns the transaction reference.
 */
export async function distributeCommissionOnChain(
  partnerWallet: string,
  partnerId: string,
  tier: string
): Promise<{ txRef: string; amountNano: bigint; explorerUrl: string }> {
  const contractAddr = config.ton.contracts.revenueDistribution;
  if (!config.ton.adminMnemonic || !contractAddr) {
    throw new Error('TON admin mnemonic or RevenueDistribution address not configured');
  }

  // 1. Check pending amount on-chain
  const pendingNano = await getPendingCommissionOnChain(partnerWallet);
  if (pendingNano < MIN_PAYOUT_NANO) {
    throw new Error(
      `Pending commission ${pendingNano}n nanoTON is below minimum ${MIN_PAYOUT_NANO}n (1 TON)`
    );
  }

  // 2. Check contract balance can cover the payout
  const stats = await getContractStats();
  const reserveNano = BigInt(100_000_000); // 0.1 TON reserve
  if (stats.contractBalance < pendingNano + reserveNano) {
    throw new Error(
      `Contract balance (${stats.contractBalance}n) insufficient to cover payout (${pendingNano}n + reserve)`
    );
  }

  // 3. Send distributeCommission message
  const { keyPair, walletContract } = await getAdminWallet();
  const seqno = await retryFn(() => walletContract.getSeqno());
  const partnerAddr = parsePartnerAddress(partnerWallet);

  const payload = beginCell()
    .storeUint(0x21, 32)        // op::distribute_commission
    .storeUint(BigInt(Date.now()), 64) // query_id (timestamp for uniqueness)
    .storeAddress(partnerAddr)
    .endCell();

  await retryFn(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        internal({
          to: Address.parse(contractAddr),
          value: toNano('0.1'), // gas for the op + potential excesses return
          body: payload,
        }),
      ],
    })
  );

  const txRef = `seqno:${seqno}`;
  const explorerUrl = `https://testnet.tonviewer.com/${contractAddr}`;

  // 4. Record payout in DB
  const period = new Date().toISOString().slice(0, 7); // "2026-06"
  await prisma.commissionPayout.create({
    data: {
      partnerId,
      amount: pendingNano,
      tier: tier as 'BRONZE' | 'SILVER' | 'GOLD',
      period,
      status: 'COMPLETED',
      txHash: txRef,
      processedAt: new Date(),
    },
  });

  logger.info(
    `[Revenue] distributeCommission: partner=${partnerWallet.slice(0, 8)}…, ` +
    `amount=${pendingNano}n nanoTON, seqno=${seqno}`
  );

  return { txRef, amountNano: pendingNano, explorerUrl };
}

/**
 * Send plain TON to fund the contract's payout reserve.
 * Call this once before demo to ensure the contract can pay partners.
 */
export async function fundContractOnChain(amountTon: number): Promise<string> {
  const contractAddr = config.ton.contracts.revenueDistribution;
  if (!config.ton.adminMnemonic || !contractAddr) {
    throw new Error('TON config not set');
  }

  const { keyPair, walletContract } = await getAdminWallet();
  const seqno = await retryFn(() => walletContract.getSeqno());

  // Plain TON transfer (empty body) — contract accepts this as funding
  await retryFn(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        internal({
          to: Address.parse(contractAddr),
          value: toNano(amountTon.toString()),
          body: beginCell().endCell(), // empty = plain transfer
        }),
      ],
    })
  );

  logger.info(`[Revenue] Funded contract with ${amountTon} TON, seqno=${seqno}`);
  return `seqno:${seqno}`;
}
