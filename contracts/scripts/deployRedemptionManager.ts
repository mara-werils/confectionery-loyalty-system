import { toNano, Address } from '@ton/core';
import { RedemptionManager } from '../wrappers/RedemptionManager';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const redemptionManagerCode = await compile('RedemptionManager');

  // Get loyalty token address from args or use placeholder
  const loyaltyTokenAddress = args[0]
    ? Address.parse(args[0])
    : provider.sender().address!;

  const redemptionManager = provider.open(
    RedemptionManager.createFromConfig(
      {
        adminAddress: provider.sender().address!,
        loyaltyTokenAddress,
      },
      redemptionManagerCode
    )
  );

  await redemptionManager.sendDeploy(provider.sender(), toNano('0.5'));

  await provider.waitForDeploy(redemptionManager.address);

  console.log('✅ RedemptionManager deployed at:', redemptionManager.address.toString());
  console.log('📋 Manager data:');

  const admin = await redemptionManager.getAdmin();
  const rewardCount = await redemptionManager.getRewardCount();
  
  console.log('   - Admin:', admin.toString());
  console.log('   - Reward Count:', rewardCount.toString());
}




