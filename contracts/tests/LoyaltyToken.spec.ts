import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { LoyaltyToken, createJettonContent, Opcodes } from '../wrappers/LoyaltyToken';
import { JettonWallet } from '../wrappers/JettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('LoyaltyToken', () => {
  let loyaltyTokenCode: Cell;
  let jettonWalletCode: Cell;
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let loyaltyToken: SandboxContract<LoyaltyToken>;

  beforeAll(async () => {
    loyaltyTokenCode = await compile('LoyaltyToken');
    jettonWalletCode = await compile('JettonWallet');
  });

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');

    const content = createJettonContent({
      name: 'Loyalty Points',
      symbol: 'LOYAL',
      description: 'Confectionery Loyalty System Points',
      decimals: 9,
    });

    loyaltyToken = blockchain.openContract(
      LoyaltyToken.createFromConfig(
        {
          totalSupply: 0n,
          adminAddress: deployer.address,
          content,
          jettonWalletCode,
        },
        loyaltyTokenCode
      )
    );

    const deployResult = await loyaltyToken.sendDeploy(deployer.getSender(), toNano('0.5'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: loyaltyToken.address,
      deploy: true,
      success: true,
    });
  });

  describe('Deployment', () => {
    it('should deploy with correct initial state', async () => {
      const data = await loyaltyToken.getJettonData();

      expect(data.totalSupply).toBe(0n);
      expect(data.mintable).toBe(true);
      expect(data.adminAddress.toString()).toBe(deployer.address.toString());
    });
  });

  describe('Minting', () => {
    it('should mint tokens to address (admin only)', async () => {
      const recipient = await blockchain.treasury('recipient');
      const mintAmount = toNano('1000');

      await loyaltyToken.sendMint(deployer.getSender(), {
        value: toNano('0.1'),
        toAddress: recipient.address,
        amount: mintAmount,
      });

      const data = await loyaltyToken.getJettonData();
      expect(data.totalSupply).toBe(mintAmount);
    });

    it('should reject minting from non-admin', async () => {
      const attacker = await blockchain.treasury('attacker');
      const recipient = await blockchain.treasury('recipient');

      const result = await loyaltyToken.sendMint(attacker.getSender(), {
        value: toNano('0.1'),
        toAddress: recipient.address,
        amount: toNano('1000'),
      });

      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: loyaltyToken.address,
        success: false,
        exitCode: 73, // Not admin
      });
    });

    it('should create jetton wallet on first mint', async () => {
      const recipient = await blockchain.treasury('recipient');
      
      await loyaltyToken.sendMint(deployer.getSender(), {
        value: toNano('0.1'),
        toAddress: recipient.address,
        amount: toNano('500'),
      });

      const walletAddress = await loyaltyToken.getWalletAddress(recipient.address);
      expect(walletAddress).toBeDefined();
    });
  });

  describe('Admin Functions', () => {
    it('should change admin', async () => {
      const newAdmin = await blockchain.treasury('newAdmin');

      await loyaltyToken.sendChangeAdmin(deployer.getSender(), {
        value: toNano('0.05'),
        newAdmin: newAdmin.address,
      });

      const data = await loyaltyToken.getJettonData();
      expect(data.adminAddress.toString()).toBe(newAdmin.address.toString());
    });

    it('should reject admin change from non-admin', async () => {
      const attacker = await blockchain.treasury('attacker');
      const newAdmin = await blockchain.treasury('newAdmin');

      const result = await loyaltyToken.sendChangeAdmin(attacker.getSender(), {
        value: toNano('0.05'),
        newAdmin: newAdmin.address,
      });

      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: loyaltyToken.address,
        success: false,
        exitCode: 73,
      });
    });
  });
});




