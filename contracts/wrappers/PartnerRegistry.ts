import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
} from '@ton/core';

// Partner tiers
export enum PartnerTier {
  Bronze = 1,
  Silver = 2,
  Gold = 3,
}

// Partner status
export enum PartnerStatus {
  Pending = 0,
  Active = 1,
  Suspended = 2,
  Banned = 3,
}

// Tier multipliers (basis points, 10000 = 1x)
export const TierMultipliers = {
  [PartnerTier.Bronze]: 10000n,  // 1x
  [PartnerTier.Silver]: 15000n,  // 1.5x
  [PartnerTier.Gold]: 20000n,    // 2x
};

export type PartnerRegistryConfig = {
  adminAddress: Address;
};

export function partnerRegistryConfigToCell(config: PartnerRegistryConfig): Cell {
  return beginCell()
    .storeAddress(config.adminAddress)
    .storeUint(0, 32) // partner_count
    .storeDict(null) // partners dictionary
    .endCell();
}

export const Opcodes = {
  registerPartner: 0x1,
  updatePartnerTier: 0x2,
  updatePartnerStatus: 0x3,
  recordEarning: 0x4,
  changeAdmin: 0x6501f354,
};

export class PartnerRegistry implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new PartnerRegistry(address);
  }

  static createFromConfig(config: PartnerRegistryConfig, code: Cell, workchain = 0) {
    const data = partnerRegistryConfigToCell(config);
    const init = { code, data };
    return new PartnerRegistry(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Register new partner (admin only)
   */
  async sendRegisterPartner(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      tier: PartnerTier;
      kycHash: bigint;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.registerPartner, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .storeUint(opts.tier, 8)
        .storeUint(opts.kycHash, 256)
        .endCell(),
    });
  }

  /**
   * Update partner tier (admin only)
   */
  async sendUpdatePartnerTier(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      newTier: PartnerTier;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.updatePartnerTier, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .storeUint(opts.newTier, 8)
        .endCell(),
    });
  }

  /**
   * Update partner status (admin only)
   */
  async sendUpdatePartnerStatus(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      newStatus: PartnerStatus;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.updatePartnerStatus, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .storeUint(opts.newStatus, 8)
        .endCell(),
    });
  }

  /**
   * Record earning for partner
   */
  async sendRecordEarning(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      partnerAddress: Address;
      amount: bigint;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.recordEarning, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.partnerAddress)
        .storeCoins(opts.amount)
        .endCell(),
    });
  }

  /**
   * Change admin (admin only)
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
   * Get admin address
   */
  async getAdmin(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_admin', []);
    return result.stack.readAddress();
  }

  /**
   * Get partner count
   */
  async getPartnerCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_partner_count', []);
    return result.stack.readBigNumber();
  }

  /**
   * Get partner info
   */
  async getPartnerInfo(
    provider: ContractProvider,
    partnerAddress: Address
  ): Promise<{
    tier: PartnerTier;
    status: PartnerStatus;
    kycHash: bigint;
    registeredAt: bigint;
    totalEarned: bigint;
    multiplier: bigint;
  } | null> {
    try {
      const result = await provider.get('get_partner_info', [
        { type: 'slice', cell: beginCell().storeAddress(partnerAddress).endCell() },
      ]);
      
      const tier = Number(result.stack.readBigNumber());
      const status = Number(result.stack.readBigNumber());
      const kycHash = result.stack.readBigNumber();
      const registeredAt = result.stack.readBigNumber();
      const totalEarned = result.stack.readBigNumber();
      const multiplier = result.stack.readBigNumber();
      
      if (tier === 0 && status === 0) {
        return null;
      }
      
      return { tier, status, kycHash, registeredAt, totalEarned, multiplier };
    } catch {
      return null;
    }
  }

  /**
   * Check if partner is active
   */
  async isPartnerActive(provider: ContractProvider, partnerAddress: Address): Promise<boolean> {
    const result = await provider.get('is_partner_active', [
      { type: 'slice', cell: beginCell().storeAddress(partnerAddress).endCell() },
    ]);
    return result.stack.readBoolean();
  }

  /**
   * Get tier multiplier
   */
  async getTierMultiplier(provider: ContractProvider, tier: PartnerTier): Promise<bigint> {
    const result = await provider.get('get_tier_multiplier', [
      { type: 'int', value: BigInt(tier) },
    ]);
    return result.stack.readBigNumber();
  }
}




