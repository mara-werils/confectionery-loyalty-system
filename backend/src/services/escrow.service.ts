import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4, internal, toNano, beginCell, Address, TupleReader } from '@ton/ton';
import { config } from '../config';
import { tonClient } from './ton';
import { logger } from '../utils/logger';

// Op codes — must match contracts/contracts/imports/op-codes.fc
const OP_ESCROW_RELEASE = 0x30;
const OP_ESCROW_REFUND = 0x31;

// On-chain order lifecycle — must match STATUS_* in sweet_pass_escrow.fc
export enum OnChainStatus {
  NotFound = 0,
  Funded = 1,
  Released = 2,
  Refunded = 3,
}

export interface OnChainOrder {
  customer: Address | null;
  partner: Address | null;
  amount: bigint;
  deadline: number;
  status: OnChainStatus;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryFn<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { status: number }; message?: string };
      if (e?.response?.status === 429 || e?.message?.includes('429')) {
        logger.warn(`[Escrow] Rate limited (429), retrying in ${delayMs / 1000}s (${i + 1}/${retries})...`);
        await sleep(delayMs);
        delayMs *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded for TON API');
}

function escrowAddress(): Address {
  const addr = config.ton.contracts.sweetPassEscrow;
  if (!addr) throw new Error('SWEET_PASS_ESCROW_ADDRESS not configured');
  return Address.parse(addr);
}

/**
 * Build the forward_payload cell that a customer's SWEET jetton transfer must
 * carry so the escrow opens a FUNDED order. Layout (single cell):
 *   order_id:uint64  partner:MsgAddress  deadline:uint64
 *
 * Returned as a base64 BOC string so the frontend can attach it verbatim to the
 * TonConnect jetton-transfer message (or rebuild it with the same fields).
 */
export function buildDepositPayloadBoc(opts: {
  orderId: bigint;
  partnerWallet: string;
  deadline: number; // unix seconds
}): string {
  const payload = beginCell()
    .storeUint(opts.orderId, 64)
    .storeAddress(Address.parse(opts.partnerWallet))
    .storeUint(opts.deadline, 64)
    .endCell();
  return payload.toBoc().toString('base64');
}

/**
 * Read one order straight from the escrow contract's get_order method.
 * This is the source of truth for confirming a deposit (FUNDED) and for
 * verifying a release/refund actually landed on-chain.
 */
export async function getOnChainOrder(orderId: bigint): Promise<OnChainOrder> {
  const result = await retryFn(() =>
    tonClient.runMethod(escrowAddress(), 'get_order', [
      { type: 'int', value: orderId },
    ])
  );
  const stack: TupleReader = result.stack;
  const customer = stack.readAddressOpt();
  const partner = stack.readAddressOpt();
  const amount = stack.readBigNumber();
  const deadline = Number(stack.readBigNumber());
  const status = Number(stack.readBigNumber()) as OnChainStatus;
  return { customer, partner, amount, deadline, status };
}

/** The escrow's own SWEET jetton wallet (where escrowed balance physically lives). */
export async function getEscrowJettonWallet(): Promise<string> {
  const result = await retryFn(() =>
    tonClient.runMethod(escrowAddress(), 'get_escrow_jetton_wallet', [])
  );
  return result.stack.readAddress().toString();
}

async function openAdminWallet() {
  if (!config.ton.adminMnemonic) throw new Error('Admin mnemonic not configured');
  const keyPair = await mnemonicToPrivateKey(config.ton.adminMnemonic.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return { walletContract: tonClient.open(wallet), keyPair };
}

/**
 * Admin-signed release: FUNDED -> RELEASED, escrow pays the partner.
 * Sends op::escrow_release(order_id) to the escrow contract.
 */
export async function releaseOnChain(orderId: bigint): Promise<string> {
  const { walletContract, keyPair } = await openAdminWallet();
  const seqno = await retryFn(() => walletContract.getSeqno());

  const body = beginCell()
    .storeUint(OP_ESCROW_RELEASE, 32)
    .storeUint(BigInt(seqno), 64) // query_id (also doubles as a replay-safe nonce)
    .storeUint(orderId, 64)
    .endCell();

  await retryFn(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        internal({
          to: escrowAddress(),
          // Must cover the onward jetton transfer (sent with mode 64 from the escrow).
          value: toNano('0.15'),
          body,
        }),
      ],
    })
  );

  logger.info(`[Escrow] release sent: order=${orderId} seqno=${seqno}`);
  return `seqno:${seqno}`;
}

/**
 * Keeper-signed refund: FUNDED -> REFUNDED, escrow refunds the customer.
 * Permissionless on-chain (the contract enforces now() >= deadline); the backend
 * simply acts as the keeper that pokes the contract after expiry.
 */
export async function refundOnChain(orderId: bigint): Promise<string> {
  const { walletContract, keyPair } = await openAdminWallet();
  const seqno = await retryFn(() => walletContract.getSeqno());

  const body = beginCell()
    .storeUint(OP_ESCROW_REFUND, 32)
    .storeUint(BigInt(seqno), 64)
    .storeUint(orderId, 64)
    .endCell();

  await retryFn(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        internal({
          to: escrowAddress(),
          value: toNano('0.15'),
          body,
        }),
      ],
    })
  );

  logger.info(`[Escrow] refund sent: order=${orderId} seqno=${seqno}`);
  return `seqno:${seqno}`;
}
