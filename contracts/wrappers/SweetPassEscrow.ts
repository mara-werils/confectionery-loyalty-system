import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from '@ton/core';

// Order lifecycle (mirrors STATUS_* constants in sweet_pass_escrow.fc)
export enum OrderStatus {
  NotFound = 0,
  Funded = 1,
  Released = 2,
  Refunded = 3,
}

export type SweetPassEscrowConfig = {
  adminAddress: Address;
  jettonMasterAddress: Address;
  jettonWalletCode: Cell;
};

export function sweetPassEscrowConfigToCell(config: SweetPassEscrowConfig): Cell {
  return beginCell()
    .storeAddress(config.adminAddress)
    .storeAddress(config.jettonMasterAddress)
    .storeRef(config.jettonWalletCode)
    .storeUint(0, 32) // order_count
    .storeDict(null) // orders dictionary
    .endCell();
}

export const Opcodes = {
  escrowRelease: 0x30,
  escrowRefund: 0x31,
  changeAdmin: 0x6501f354,
};

export type EscrowOrder = {
  customer: Address | null;
  partner: Address | null;
  amount: bigint;
  deadline: number;
  status: OrderStatus;
};

/**
 * Builds the forward_payload that a customer's SWEET jetton transfer must carry
 * so the escrow can open a FUNDED order. Layout (single cell):
 *   order_id:uint64  partner:MsgAddress  deadline:uint64
 */
export function buildDepositPayload(opts: {
  orderId: bigint;
  partner: Address;
  deadline: number;
}): Cell {
  return beginCell()
    .storeUint(opts.orderId, 64)
    .storeAddress(opts.partner)
    .storeUint(opts.deadline, 64)
    .endCell();
}

export class SweetPassEscrow implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new SweetPassEscrow(address);
  }

  static createFromConfig(config: SweetPassEscrowConfig, code: Cell, workchain = 0) {
    const data = sweetPassEscrowConfigToCell(config);
    const init = { code, data };
    return new SweetPassEscrow(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /** Top up the contract with plain TON for gas reserve. */
  async sendTopUp(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Release an escrowed order to the partner (admin only).
   * FUNDED -> RELEASED, then transfers the escrowed SWEET to the partner.
   */
  async sendRelease(
    provider: ContractProvider,
    via: Sender,
    opts: { value: bigint; orderId: bigint; queryId?: bigint }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.escrowRelease, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeUint(opts.orderId, 64)
        .endCell(),
    });
  }

  /**
   * Refund an escrowed order to the customer (permissionless, after deadline).
   * FUNDED -> REFUNDED, then transfers the escrowed SWEET back to the customer.
   */
  async sendRefund(
    provider: ContractProvider,
    via: Sender,
    opts: { value: bigint; orderId: bigint; queryId?: bigint }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.escrowRefund, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeUint(opts.orderId, 64)
        .endCell(),
    });
  }

  /** Rotate the admin address (admin only). */
  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    opts: { value: bigint; newAdmin: Address; queryId?: bigint }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.changeAdmin, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.newAdmin)
        .endCell(),
    });
  }

  async getAdmin(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_admin', []);
    return result.stack.readAddress();
  }

  async getOrderCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_order_count', []);
    return result.stack.readBigNumber();
  }

  async getJettonMaster(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_jetton_master', []);
    return result.stack.readAddress();
  }

  /** The escrow's own SWEET jetton wallet — where all escrowed balance lives. */
  async getEscrowJettonWallet(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_escrow_jetton_wallet', []);
    return result.stack.readAddress();
  }

  /**
   * Fetch one order. status === OrderStatus.NotFound (0) means no such order.
   */
  async getOrder(provider: ContractProvider, orderId: bigint): Promise<EscrowOrder> {
    const result = await provider.get('get_order', [
      { type: 'int', value: orderId },
    ]);
    const customer = result.stack.readAddressOpt();
    const partner = result.stack.readAddressOpt();
    const amount = result.stack.readBigNumber();
    const deadline = Number(result.stack.readBigNumber());
    const status = Number(result.stack.readBigNumber()) as OrderStatus;
    return { customer, partner, amount, deadline, status };
  }
}
