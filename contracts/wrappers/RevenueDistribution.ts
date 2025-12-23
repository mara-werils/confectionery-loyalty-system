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

// Commission rates in basis points (10000 = 100%)
export const CommissionRates = {
  Bronze: 300n,   // 3%
  Silver: 500n,   // 5%
  Gold: 700n,     // 7%
  Platform: 100n, // 1%
};

export type RevenueDistributionConfig = {
  adminAddress: Address;
  partnerRegistryAddress: Address;
};

export function revenueDistributionConfigToCell(config: RevenueDistributionConfig): Cell {
  return beginCell()
    .storeAddress(config.adminAddress)
    .storeAddress(config.partnerRegistryAddress)
    .storeCoins(0) // total_distributed
    .storeCoins(0) // platform_balance
    .storeUint(0, 32) // payout_count
    .storeDict(null) // pending_payouts
    .storeDict(null) // payout_history
    .endCell();
}

export const Opcodes = {
  recordTransaction: 0x20,
  distributeCommission: 0x21,
  batchDistribute: 0x22,
  withdrawPlatformFee: 0x23,
  setPartnerRegistry: 0x24,
  commissionPayout: 0x25,
  changeAdmin: 0x6501f354,
};

export class RevenueDistribution implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new RevenueDistribution(address);
  }

  static createFromConfig(config: RevenueDistributionConfig, code: Cell, workchain = 0) {
    const data = revenueDistributionConfigToCell(config);
    const init = { code, data };
    return new RevenueDistribution(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Fund the contract with TON for payouts
   */
  async sendFund(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(), // Empty body = plain transfer
    });
  }

  /**
   * Record transaction and calculate commission
   */
  async sendRecordTransaction(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      amount: bigint;
      tier: number;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.recordTransaction, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .storeCoins(opts.amount)
        .storeUint(opts.tier, 8)
        .endCell(),
    });
  }

  /**
   * Distribute pending commission to partner
   */
  async sendDistributeCommission(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.distributeCommission, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .endCell(),
    });
  }

  /**
   * Batch distribute to multiple partners (admin only)
   */
  async sendBatchDistribute(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddresses: Address[];
      queryId?: bigint;
    }
  ) {
    let body = beginCell()
      .storeUint(Opcodes.batchDistribute, 32)
      .storeUint(opts.queryId ?? 0, 64)
      .storeUint(opts.partnerAddresses.length, 8);
    
    for (const addr of opts.partnerAddresses) {
      body = body.storeAddress(addr);
    }

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body.endCell(),
    });
  }

  /**
   * Withdraw platform fees (admin only)
   */
  async sendWithdrawPlatformFee(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      amount: bigint;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.withdrawPlatformFee, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.amount)
        .endCell(),
    });
  }

  /**
   * Set partner registry address (admin only)
   */
  async sendSetPartnerRegistry(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerRegistryAddress: Address;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.setPartnerRegistry, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerRegistryAddress)
        .endCell(),
    });
  }

  /**
   * Get admin address
   */
  async getAdmin(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_admin', []);
    return result.stack.readAddress();
  }

  /**
   * Get total distributed amount
   */
  async getTotalDistributed(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_total_distributed', []);
    return result.stack.readBigNumber();
  }

  /**
   * Get platform balance
   */
  async getPlatformBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_platform_balance', []);
    return result.stack.readBigNumber();
  }

  /**
   * Get pending payout for partner
   */
  async getPendingPayout(provider: ContractProvider, partnerAddress: Address): Promise<bigint> {
    const result = await provider.get('get_pending_payout', [
      { type: 'slice', cell: beginCell().storeAddress(partnerAddress).endCell() },
    ]);
    return result.stack.readBigNumber();
  }

  /**
   * Get payout count
   */
  async getPayoutCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_payout_count', []);
    return result.stack.readBigNumber();
  }

  /**
   * Preview commission calculation
   */
  async calculateCommissionPreview(
    provider: ContractProvider,
    amount: bigint,
    tier: number
  ): Promise<{ commission: bigint; platformFee: bigint }> {
    const result = await provider.get('calculate_commission_preview', [
      { type: 'int', value: amount },
      { type: 'int', value: BigInt(tier) },
    ]);
    return {
      commission: result.stack.readBigNumber(),
      platformFee: result.stack.readBigNumber(),
    };
  }
}




