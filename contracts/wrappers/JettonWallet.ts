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

export type JettonWalletConfig = {
  balance: bigint;
  ownerAddress: Address;
  jettonMasterAddress: Address;
  jettonWalletCode: Cell;
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeAddress(config.ownerAddress)
    .storeAddress(config.jettonMasterAddress)
    .storeRef(config.jettonWalletCode)
    .endCell();
}

export const Opcodes = {
  transfer: 0x0f8a7ea5,
  internalTransfer: 0x178d4519,
  transferNotification: 0x7362d09c,
  excesses: 0xd53276db,
  burn: 0x595f07bc,
  burnNotification: 0x7bdd97de,
};

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
    const data = jettonWalletConfigToCell(config);
    const init = { code, data };
    return new JettonWallet(contractAddress(workchain, init), init);
  }

  /**
   * Transfer tokens to another address
   */
  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      toAddress: Address;
      amount: bigint;
      responseAddress?: Address;
      forwardTonAmount?: bigint;
      forwardPayload?: Cell;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.transfer, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.amount)
        .storeAddress(opts.toAddress)
        .storeAddress(opts.responseAddress ?? via.address)
        .storeBit(false) // no custom payload
        .storeCoins(opts.forwardTonAmount ?? 0)
        .storeMaybeRef(opts.forwardPayload)
        .endCell(),
    });
  }

  /**
   * Burn tokens
   */
  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      amount: bigint;
      responseAddress?: Address;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.burn, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.amount)
        .storeAddress(opts.responseAddress ?? via.address)
        .endCell(),
    });
  }

  /**
   * Get wallet data (TEP-74 standard)
   */
  async getWalletData(provider: ContractProvider): Promise<{
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
  }> {
    const result = await provider.get('get_wallet_data', []);
    return {
      balance: result.stack.readBigNumber(),
      ownerAddress: result.stack.readAddress(),
      jettonMasterAddress: result.stack.readAddress(),
      jettonWalletCode: result.stack.readCell(),
    };
  }

  /**
   * Get balance
   */
  async getBalance(provider: ContractProvider): Promise<bigint> {
    const data = await this.getWalletData(provider);
    return data.balance;
  }
}




