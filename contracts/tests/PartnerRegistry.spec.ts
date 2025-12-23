import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import {
  PartnerRegistry,
  PartnerTier,
  PartnerStatus,
  TierMultipliers,
} from '../wrappers/PartnerRegistry';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('PartnerRegistry', () => {
  let partnerRegistryCode: Cell;
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let partnerRegistry: SandboxContract<PartnerRegistry>;

  beforeAll(async () => {
    partnerRegistryCode = await compile('PartnerRegistry');
  });

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');

    partnerRegistry = blockchain.openContract(
      PartnerRegistry.createFromConfig(
        {
          adminAddress: deployer.address,
        },
        partnerRegistryCode
      )
    );

    const deployResult = await partnerRegistry.sendDeploy(deployer.getSender(), toNano('0.5'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: partnerRegistry.address,
      deploy: true,
      success: true,
    });
  });

  describe('Deployment', () => {
    it('should deploy with correct initial state', async () => {
      const admin = await partnerRegistry.getAdmin();
      const count = await partnerRegistry.getPartnerCount();

      expect(admin.toString()).toBe(deployer.address.toString());
      expect(count).toBe(0n);
    });
  });

  describe('Partner Registration', () => {
    it('should register new partner (admin only)', async () => {
      const partner = await blockchain.treasury('partner');
      const kycHash = BigInt('0x' + 'a'.repeat(64));

      await partnerRegistry.sendRegisterPartner(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: PartnerTier.Silver,
        kycHash,
      });

      const count = await partnerRegistry.getPartnerCount();
      expect(count).toBe(1n);

      const info = await partnerRegistry.getPartnerInfo(partner.address);
      expect(info).not.toBeNull();
      expect(info!.tier).toBe(PartnerTier.Silver);
      expect(info!.status).toBe(PartnerStatus.Active);
      expect(info!.multiplier).toBe(TierMultipliers[PartnerTier.Silver]);
    });

    it('should reject duplicate registration', async () => {
      const partner = await blockchain.treasury('partner');
      const kycHash = BigInt('0x' + 'b'.repeat(64));

      await partnerRegistry.sendRegisterPartner(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: PartnerTier.Bronze,
        kycHash,
      });

      const result = await partnerRegistry.sendRegisterPartner(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: PartnerTier.Gold,
        kycHash,
      });

      expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: partnerRegistry.address,
        success: false,
        exitCode: 101, // Partner already exists
      });
    });

    it('should reject registration with invalid tier', async () => {
      const partner = await blockchain.treasury('partner');

      const result = await partnerRegistry.sendRegisterPartner(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: 99 as PartnerTier, // Invalid tier
        kycHash: 0n,
      });

      expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: partnerRegistry.address,
        success: false,
        exitCode: 100, // Invalid tier
      });
    });
  });

  describe('Partner Updates', () => {
    let partner: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
      partner = await blockchain.treasury('partner');
      await partnerRegistry.sendRegisterPartner(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: PartnerTier.Bronze,
        kycHash: 0n,
      });
    });

    it('should update partner tier', async () => {
      await partnerRegistry.sendUpdatePartnerTier(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        newTier: PartnerTier.Gold,
      });

      const info = await partnerRegistry.getPartnerInfo(partner.address);
      expect(info!.tier).toBe(PartnerTier.Gold);
      expect(info!.multiplier).toBe(TierMultipliers[PartnerTier.Gold]);
    });

    it('should update partner status', async () => {
      await partnerRegistry.sendUpdatePartnerStatus(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        newStatus: PartnerStatus.Suspended,
      });

      const info = await partnerRegistry.getPartnerInfo(partner.address);
      expect(info!.status).toBe(PartnerStatus.Suspended);

      const isActive = await partnerRegistry.isPartnerActive(partner.address);
      expect(isActive).toBe(false);
    });

    it('should record earnings', async () => {
      const amount = toNano('100');

      await partnerRegistry.sendRecordEarning(deployer.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        amount,
      });

      const info = await partnerRegistry.getPartnerInfo(partner.address);
      expect(info!.totalEarned).toBe(amount);
    });
  });

  describe('Tier Multipliers', () => {
    it('should return correct multipliers for each tier', async () => {
      const bronzeMultiplier = await partnerRegistry.getTierMultiplier(PartnerTier.Bronze);
      const silverMultiplier = await partnerRegistry.getTierMultiplier(PartnerTier.Silver);
      const goldMultiplier = await partnerRegistry.getTierMultiplier(PartnerTier.Gold);

      expect(bronzeMultiplier).toBe(10000n); // 1x
      expect(silverMultiplier).toBe(15000n); // 1.5x
      expect(goldMultiplier).toBe(20000n); // 2x
    });
  });

  describe('Access Control', () => {
    it('should reject registration from non-admin', async () => {
      const attacker = await blockchain.treasury('attacker');
      const partner = await blockchain.treasury('partner');

      const result = await partnerRegistry.sendRegisterPartner(attacker.getSender(), {
        value: toNano('0.1'),
        partnerAddress: partner.address,
        tier: PartnerTier.Bronze,
        kycHash: 0n,
      });

      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: partnerRegistry.address,
        success: false,
        exitCode: 73,
      });
    });
  });
});




