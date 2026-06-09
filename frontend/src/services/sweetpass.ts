import { Address, beginCell, Cell, toNano } from '@ton/core';
import { tonClient } from './ton';

// TEP-74 jetton transfer op-code
const JETTON_TRANSFER_OP = 0x0f8a7ea5;

/**
 * Resolve the owner's SWEET jetton wallet address by calling get_wallet_address
 * on the jetton master. The customer signs the transfer FROM this wallet.
 */
export async function getJettonWalletAddress(jettonMaster: string, owner: string): Promise<Address> {
  const master = Address.parse(jettonMaster);
  const ownerAddr = Address.parse(owner);
  const res = await tonClient.runMethod(master, 'get_wallet_address', [
    { type: 'slice', cell: beginCell().storeAddress(ownerAddr).endCell() },
  ]);
  return res.stack.readAddress();
}

/**
 * Build the TEP-74 transfer body that deposits SWEET into the escrow, carrying
 * the order payload (order_id, partner, deadline) as a maybe-ref forward_payload.
 * The escrow's transfer_notification handler reads exactly this layout.
 */
export function buildJettonDepositBody(opts: {
  jettonAmount: bigint; // nano-SWEET
  escrow: Address; // escrow contract (new jetton owner)
  responseTo: Address; // customer — receives TON excess
  forwardTonAmount: bigint; // must be > 0 to trigger the notification
  forwardPayload: Cell; // deposit payload BOC from the backend
  queryId?: bigint;
}): Cell {
  return beginCell()
    .storeUint(JETTON_TRANSFER_OP, 32)
    .storeUint(opts.queryId ?? BigInt(Date.now()), 64)
    .storeCoins(opts.jettonAmount)
    .storeAddress(opts.escrow)
    .storeAddress(opts.responseTo)
    .storeMaybeRef(null) // custom_payload — none
    .storeCoins(opts.forwardTonAmount)
    .storeMaybeRef(opts.forwardPayload) // forward_payload as a ref (has_ref = 1)
    .endCell();
}

export interface DepositInstructions {
  escrowAddress: string;
  jettonMaster: string;
  amount: string; // nano-SWEET (string to preserve precision)
  depositPayload: string; // base64 BOC
}

/**
 * Build a TonConnect transaction request that deposits the pre-order amount into
 * the escrow. Resolves the customer's jetton wallet on-chain and packs the body.
 */
export async function buildDepositTransaction(
  customerWallet: string,
  instr: DepositInstructions
) {
  const jettonWallet = await getJettonWalletAddress(instr.jettonMaster, customerWallet);
  const escrow = Address.parse(instr.escrowAddress);
  const customer = Address.parse(customerWallet);
  const forwardPayload = Cell.fromBase64(instr.depositPayload);

  const body = buildJettonDepositBody({
    jettonAmount: BigInt(instr.amount),
    escrow,
    responseTo: customer,
    forwardTonAmount: toNano('0.05'),
    forwardPayload,
  });

  return {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: jettonWallet.toString(),
        amount: toNano('0.2').toString(), // gas + forward_ton_amount
        payload: body.toBoc().toString('base64'),
      },
    ],
  };
}
