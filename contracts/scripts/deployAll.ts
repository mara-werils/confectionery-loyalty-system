import { toNano } from '@ton/core';
import { LoyaltyToken, createJettonContent } from '../wrappers/LoyaltyToken';
import { PartnerRegistry } from '../wrappers/PartnerRegistry';
import { RedemptionManager } from '../wrappers/RedemptionManager';
import { RevenueDistribution } from '../wrappers/RevenueDistribution';
import { compile, NetworkProvider } from '@ton/blueprint';

/**
 * Deploy all loyalty system contracts
 * 
 * Deployment order:
 * 1. LoyaltyToken (Jetton minter)
 * 2. PartnerRegistry
 * 3. RedemptionManager (needs LoyaltyToken address)
 * 4. RevenueDistribution (needs PartnerRegistry address)
 */
export async function run(provider: NetworkProvider) {
  console.log('🚀 Starting deployment of Confectionery Loyalty System...\n');
  
  const adminAddress = provider.sender().address!;
  console.log('👤 Admin address:', adminAddress.toString());
  console.log('');

  // Compile all contracts
  console.log('📦 Compiling contracts...');
  const [loyaltyTokenCode, jettonWalletCode, partnerRegistryCode, redemptionManagerCode, revenueDistributionCode] = await Promise.all([
    compile('LoyaltyToken'),
    compile('JettonWallet'),
    compile('PartnerRegistry'),
    compile('RedemptionManager'),
    compile('RevenueDistribution'),
  ]);
  console.log('✅ Compilation complete\n');

  // 1. Deploy LoyaltyToken
  console.log('1️⃣ Deploying LoyaltyToken...');
  const content = createJettonContent({
    name: 'Sweet Loyalty Points',
    symbol: 'SWEET',
    description: 'Loyalty points for Confectionery Partner Network',
    decimals: 9,
  });

  const loyaltyToken = provider.open(
    LoyaltyToken.createFromConfig(
      {
        totalSupply: 0n,
        adminAddress,
        content,
        jettonWalletCode,
      },
      loyaltyTokenCode
    )
  );

  await loyaltyToken.sendDeploy(provider.sender(), toNano('0.5'));
  await provider.waitForDeploy(loyaltyToken.address);
  console.log('   ✅ LoyaltyToken:', loyaltyToken.address.toString());

  // 2. Deploy PartnerRegistry
  console.log('2️⃣ Deploying PartnerRegistry...');
  const partnerRegistry = provider.open(
    PartnerRegistry.createFromConfig(
      {
        adminAddress,
      },
      partnerRegistryCode
    )
  );

  await partnerRegistry.sendDeploy(provider.sender(), toNano('0.5'));
  await provider.waitForDeploy(partnerRegistry.address);
  console.log('   ✅ PartnerRegistry:', partnerRegistry.address.toString());

  // 3. Deploy RedemptionManager
  console.log('3️⃣ Deploying RedemptionManager...');
  const redemptionManager = provider.open(
    RedemptionManager.createFromConfig(
      {
        adminAddress,
        loyaltyTokenAddress: loyaltyToken.address,
      },
      redemptionManagerCode
    )
  );

  await redemptionManager.sendDeploy(provider.sender(), toNano('0.5'));
  await provider.waitForDeploy(redemptionManager.address);
  console.log('   ✅ RedemptionManager:', redemptionManager.address.toString());

  // 4. Deploy RevenueDistribution
  console.log('4️⃣ Deploying RevenueDistribution...');
  const revenueDistribution = provider.open(
    RevenueDistribution.createFromConfig(
      {
        adminAddress,
        partnerRegistryAddress: partnerRegistry.address,
      },
      revenueDistributionCode
    )
  );

  await revenueDistribution.sendDeploy(provider.sender(), toNano('1'));
  await provider.waitForDeploy(revenueDistribution.address);
  console.log('   ✅ RevenueDistribution:', revenueDistribution.address.toString());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nContract Addresses:');
  console.log('-------------------');
  console.log('LoyaltyToken:        ', loyaltyToken.address.toString());
  console.log('PartnerRegistry:     ', partnerRegistry.address.toString());
  console.log('RedemptionManager:   ', redemptionManager.address.toString());
  console.log('RevenueDistribution: ', revenueDistribution.address.toString());
  console.log('\n💡 Save these addresses for backend configuration!');
}




