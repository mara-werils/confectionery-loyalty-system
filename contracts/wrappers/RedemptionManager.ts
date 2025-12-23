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

// Reward categories
export enum RewardCategory {
  Discount = 1,
  Product = 2,
  Cashback = 3,
  Special = 4,
}

// Redemption status
export enum RedemptionStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Fulfilled = 3,
}

export type RedemptionManagerConfig = {
  adminAddress: Address;
  loyaltyTokenAddress: Address;
};

export function redemptionManagerConfigToCell(config: RedemptionManagerConfig): Cell {
  return beginCell()
    .storeAddress(config.adminAddress)
    .storeAddress(config.loyaltyTokenAddress)
    .storeUint(0, 32) // reward_count
    .storeUint(0, 32) // redemption_count
    .storeDict(null) // rewards dictionary
    .storeDict(null) // redemptions dictionary
    .endCell();
}

export const Opcodes = {
  addReward: 0x10,
  updateReward: 0x11,
  requestRedemption: 0x12,
  processRedemption: 0x13,
  setLoyaltyToken: 0x14,
  changeAdmin: 0x6501f354,
};

export class RedemptionManager implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new RedemptionManager(address);
  }

  static createFromConfig(config: RedemptionManagerConfig, code: Cell, workchain = 0) {
    const data = redemptionManagerConfigToCell(config);
    const init = { code, data };
    return new RedemptionManager(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Add new reward to catalog (admin only)
   */
  async sendAddReward(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      pointsRequired: bigint;
      category: RewardCategory;
      available: number;
      maxClaims: number;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.addReward, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.pointsRequired)
        .storeUint(opts.category, 8)
        .storeUint(opts.available, 32)
        .storeUint(opts.maxClaims, 32)
        .endCell(),
    });
  }

  /**
   * Update reward details (admin only)
   */
  async sendUpdateReward(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      rewardId: number;
      pointsRequired: bigint;
      available: number;
      active: boolean;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.updateReward, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeUint(opts.rewardId, 32)
        .storeCoins(opts.pointsRequired)
        .storeUint(opts.available, 32)
        .storeBit(opts.active)
        .endCell(),
    });
  }

  /**
   * Request to redeem points for reward
   */
  async sendRequestRedemption(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      rewardId: number;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.requestRedemption, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeUint(opts.rewardId, 32)
        .endCell(),
    });
  }

  /**
   * Process redemption request (admin only)
   */
  async sendProcessRedemption(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      redemptionId: number;
      status: RedemptionStatus.Approved | RedemptionStatus.Rejected;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.processRedemption, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeUint(opts.redemptionId, 32)
        .storeUint(opts.status, 8)
        .endCell(),
    });
  }

  /**
   * Set loyalty token address (admin only)
   */
  async sendSetLoyaltyToken(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      loyaltyTokenAddress: Address;
      queryId?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.setLoyaltyToken, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.loyaltyTokenAddress)
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
   * Get reward count
   */
  async getRewardCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_reward_count', []);
    return result.stack.readBigNumber();
  }

  /**
   * Get redemption count
   */
  async getRedemptionCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_redemption_count', []);
    return result.stack.readBigNumber();
  }

  /**
   * Get reward by ID
   */
  async getReward(
    provider: ContractProvider,
    rewardId: number
  ): Promise<{
    pointsRequired: bigint;
    category: RewardCategory;
    available: number;
    totalClaimed: number;
    maxClaims: number;
    active: boolean;
  } | null> {
    try {
      const result = await provider.get('get_reward', [
        { type: 'int', value: BigInt(rewardId) },
      ]);
      
      const pointsRequired = result.stack.readBigNumber();
      const category = Number(result.stack.readBigNumber()) as RewardCategory;
      const available = Number(result.stack.readBigNumber());
      const totalClaimed = Number(result.stack.readBigNumber());
      const maxClaims = Number(result.stack.readBigNumber());
      const active = result.stack.readBoolean();
      
      if (pointsRequired === 0n) {
        return null;
      }
      
      return { pointsRequired, category, available, totalClaimed, maxClaims, active };
    } catch {
      return null;
    }
  }

  /**
   * Validate if redemption is possible
   */
  async validateRedemption(
    provider: ContractProvider,
    partnerAddress: Address,
    rewardId: number
  ): Promise<boolean> {
    const result = await provider.get('validate_redemption', [
      { type: 'slice', cell: beginCell().storeAddress(partnerAddress).endCell() },
      { type: 'int', value: BigInt(rewardId) },
    ]);
    return result.stack.readBoolean();
  }
}




