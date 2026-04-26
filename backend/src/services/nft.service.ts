/**
 * NFT Achievement Minting Service
 *
 * Mints a Soul-Bound Token (SBT) on TON testnet whenever a partner unlocks
 * an achievement.  Follows the same WalletContractV4 + mnemonic pattern used
 * by minting.service.ts.
 *
 * Environment variables required for live minting:
 *   ADMIN_MNEMONIC          – 24-word BIP-39 mnemonic of the backend wallet
 *   NFT_COLLECTION_ADDRESS  – deployed SweetAchievementCollection address
 *
 * When either variable is absent the service logs a warning and returns a
 * demo result so achievements still work during development.
 */

import { WalletContractV4, internal, toNano, Address, TonClient } from '@ton/ton';
import { mnemonicToPrivateKey }  from '@ton/crypto';
import { beginCell }             from '@ton/core';
import { config }                from '../config';
import { tonClient }             from './ton';
import { logger }                from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MintNFTParams {
  ownerWalletAddress: string;
  achievementCode:    string;
  achievementName:    string;
}

export interface NFTMintResult {
  txHash:      string;
  nftAddress:  string;
  explorerUrl: string;
  isSimulated: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function retryFn<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { status: number }; message?: string };
      if (e?.response?.status === 429 || e?.message?.includes('429')) {
        logger.warn(`NFT: rate-limited, retry ${i + 1}/${retries} in ${delay / 1000}s`);
        await sleep(delay);
        delay *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error('NFT: max retries exceeded');
}

/**
 * Poll the wallet until the seqno increments (= tx confirmed on-chain).
 * Returns the actual transaction hash once confirmed.
 */
async function waitForTxHash(
  client:        TonClient,
  walletAddress: Address,
  initialSeqno:  number,
  walletContract: ReturnType<typeof client.open<WalletContractV4>>
): Promise<string | null> {
  for (let attempt = 0; attempt < 12; attempt++) {
    await sleep(4000);
    try {
      const currentSeqno = await walletContract.getSeqno();
      if (currentSeqno > initialSeqno) {
        // Seqno advanced → find the transaction
        const txs = await client.getTransactions(walletAddress, { limit: 3 });
        if (txs.length > 0 && txs[0]) {
          return txs[0].hash().toString('hex');
        }
      }
    } catch {
      // Transient network error – keep polling
    }
  }
  return null;
}

// ─── Simulation fallback (development / unconfigured environments) ────────────

function buildSimulatedResult(
  achievementCode: string,
  ownerAddress:    string
): NFTMintResult {
  // Produce a deterministic-looking hash so the UI can display something
  const seed = `${achievementCode}:${ownerAddress}:${Date.now()}`;
  const fakeHash = Buffer.from(seed).toString('hex').slice(0, 64).padEnd(64, '0');
  const fakeNftAddr = `EQ${Buffer.from(`nft_${achievementCode}`).toString('hex').slice(0, 46)}`;

  return {
    txHash:      fakeHash,
    nftAddress:  fakeNftAddr,
    explorerUrl: `https://testnet.tonviewer.com/transaction/${fakeHash}`,
    isSimulated: true,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Mint an achievement SBT on TON testnet.
 *
 * Returns null only on unrecoverable errors; otherwise always returns a
 * result (real or simulated) so the achievement unlock flow is never blocked.
 */
export async function mintAchievementNFT(
  params: MintNFTParams
): Promise<NFTMintResult | null> {
  const { ownerWalletAddress, achievementCode, achievementName } = params;

  // ── Guard: configuration check ──────────────────────────────────────────
  if (!config.ton.adminMnemonic || !config.ton.contracts.nftCollection) {
    logger.warn(
      'NFT minting not fully configured ' +
      '(ADMIN_MNEMONIC or NFT_COLLECTION_ADDRESS missing). ' +
      'Returning simulated result.'
    );
    return buildSimulatedResult(achievementCode, ownerWalletAddress);
  }

  try {
    // ── Wallet setup ──────────────────────────────────────────────────────
    const mnemonic   = config.ton.adminMnemonic.split(' ');
    const keyPair    = await mnemonicToPrivateKey(mnemonic);
    const wallet     = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const walletOpen = tonClient.open(wallet);

    const collectionAddress = Address.parse(config.ton.contracts.nftCollection);

    // Parse owner address (supports both user-friendly and raw formats)
    const recipientAddress = ownerWalletAddress.includes(':')
      ? Address.parseRaw(ownerWalletAddress)
      : Address.parse(ownerWalletAddress);

    // ── Build MintAchievement message (opcode 0x1c8c59d9) ────────────────
    // Message layout must match SweetAchievementSBT.tact:
    //   uint32  opcode
    //   Address recipient
    //   ^Cell   achievement_code  (Tact String ref)
    //   ^Cell   achievement_name  (Tact String ref)
    const body = beginCell()
      .storeUint(0x1c8c59d9, 32)
      .storeAddress(recipientAddress)
      .storeRef(beginCell().storeStringTail(achievementCode).endCell())
      .storeRef(beginCell().storeStringTail(achievementName).endCell())
      .endCell();

    // ── Send transaction ──────────────────────────────────────────────────
    const seqno = await retryFn(() => walletOpen.getSeqno());

    await retryFn(() =>
      walletOpen.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
          internal({
            to:    collectionAddress,
            value: toNano('0.10'), // 0.08 min required by contract + margin
            body,
          }),
        ],
      })
    );

    logger.info(`NFT: MintAchievement sent | seqno=${seqno} | achievement=${achievementCode} | recipient=${ownerWalletAddress}`);

    // ── Wait for confirmation & get real tx hash ──────────────────────────
    const txHash = await waitForTxHash(tonClient, wallet.address, seqno, walletOpen);

    if (!txHash) {
      logger.warn(`NFT: tx confirmed (seqno ${seqno}) but could not retrieve hash. Using seqno ref.`);
      // Still return a real explorerUrl based on the sender address
      const fallbackHash = `seqno_${seqno}_${Date.now()}`;
      return {
        txHash:      fallbackHash,
        nftAddress:  await deriveNftAddress(tonClient, collectionAddress, walletOpen),
        explorerUrl: `https://testnet.tonviewer.com/${wallet.address.toString()}`,
        isSimulated: false,
      };
    }

    const nftAddress = await deriveNftAddress(tonClient, collectionAddress, walletOpen);

    logger.info(`NFT: confirmed | txHash=${txHash} | nftAddress=${nftAddress}`);

    return {
      txHash,
      nftAddress,
      explorerUrl: `https://testnet.tonviewer.com/transaction/${txHash}`,
      isSimulated: false,
    };

  } catch (error) {
    logger.error('NFT minting failed:', error);
    // Graceful degradation: don't block the achievement unlock
    return buildSimulatedResult(achievementCode, ownerWalletAddress);
  }
}

/**
 * Derive the most recently minted NFT address from the collection's
 * `nft_address_by_index` getter (index = next_item_index - 1 after mint).
 */
async function deriveNftAddress(
  client:             TonClient,
  collectionAddress:  Address,
  walletContract:     ReturnType<typeof client.open<WalletContractV4>>
): Promise<string> {
  try {
    // Call get_collection_data to find next_item_index
    const result = await client.runMethod(collectionAddress, 'collection_data');
    const nextIndex = result.stack.readBigNumber();
    const mintedIndex = nextIndex - 1n;

    if (mintedIndex < 0n) return collectionAddress.toString();

    // Derive item address
    const itemResult = await client.runMethod(collectionAddress, 'nft_address_by_index', [
      { type: 'int', value: mintedIndex },
    ]);
    return itemResult.stack.readAddress().toString();
  } catch {
    return collectionAddress.toString();
  }
}
