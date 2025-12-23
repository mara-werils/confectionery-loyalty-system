import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

export type LoyaltyTokenConfig = {
  totalSupply: bigint;
  adminAddress: Address;
  content: Cell;
  jettonWalletCode: Cell;
};

export function loyaltyTokenConfigToCell(config: LoyaltyTokenConfig): Cell {
  return beginCell()
    .storeCoins(config.totalSupply)
    .storeAddress(config.adminAddress)
    .storeRef(config.content)
    .storeRef(config.jettonWalletCode)
    .endCell();
}

export const Opcodes = {
  mint: 0x642b7d07,
  burn: 0x595f07bc,
  burnNotification: 0x7bdd97de,
  transfer: 0x0f8a7ea5,
  internalTransfer: 0x178d4519,
  transferNotification: 0x7362d09c,
  excesses: 0xd53276db,
  changeAdmin: 0x6501f354,
  changeContent: 0x5773d1f5,
};

export class LoyaltyToken implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new LoyaltyToken(address);
  }

  static createFromConfig(config: LoyaltyTokenConfig, code: Cell, workchain = 0) {
    const data = loyaltyTokenConfigToCell(config);
    const init = { code, data };
    return new LoyaltyToken(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Mint new loyalty tokens (admin only)
   */
  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      toAddress: Address;
      amount: bigint;
      forwardPayload?: Cell;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.mint, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.amount)
        .storeRef(opts.forwardPayload ?? beginCell().endCell())
        .endCell(),
    });
  }

  /**
   * Change admin address (admin only)
   */
  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      newAdmin: Address;
      queryId?: bigint;
    }
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

  /**
   * Update token content/metadata (admin only)
   */
  async sendChangeContent(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      newContent: Cell;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.changeContent, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeRef(opts.newContent)
        .endCell(),
    });
  }

  /**
   * Get jetton data (TEP-74 standard)
   */
  async getJettonData(provider: ContractProvider): Promise<{
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
  }> {
    const result = await provider.get('get_jetton_data', []);
    return {
      totalSupply: result.stack.readBigNumber(),
      mintable: result.stack.readBoolean(),
      adminAddress: result.stack.readAddress(),
      content: result.stack.readCell(),
      jettonWalletCode: result.stack.readCell(),
    };
  }

  /**
   * Get wallet address for owner
   */
  async getWalletAddress(provider: ContractProvider, ownerAddress: Address): Promise<Address> {
    const result = await provider.get('get_wallet_address', [
      { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() },
    ]);
    return result.stack.readAddress();
  }
}

/**
 * Create on-chain metadata content cell
 */
export function createJettonContent(params: {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals?: number;
}): Cell {
  const dict = beginCell();
  
  // Simplified on-chain metadata
  const content = beginCell()
    .storeUint(0x00, 8) // On-chain metadata tag
    .storeStringTail(JSON.stringify({
      name: params.name,
      symbol: params.symbol,
      description: params.description || '',
      image: params.image || '',
      decimals: params.decimals?.toString() || '9',
    }))
    .endCell();
  
  return content;
}




