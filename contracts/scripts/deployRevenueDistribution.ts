import { toNano, Address } from '@ton/core';
import { RevenueDistribution } from '../wrappers/RevenueDistribution';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const revenueDistributionCode = await compile('RevenueDistribution');

  // Get partner registry address from args or use placeholder
  const partnerRegistryAddress = args[0]
    ? Address.parse(args[0])
    : provider.sender().address!;

  const revenueDistribution = provider.open(
    RevenueDistribution.createFromConfig(
      {
        adminAddress: provider.sender().address!,
        partnerRegistryAddress,
      },
      revenueDistributionCode
    )
  );

  await revenueDistribution.sendDeploy(provider.sender(), toNano('1'));

  await provider.waitForDeploy(revenueDistribution.address);

  console.log('✅ RevenueDistribution deployed at:', revenueDistribution.address.toString());
  console.log('📋 Distribution data:');

  const admin = await revenueDistribution.getAdmin();
  const totalDistributed = await revenueDistribution.getTotalDistributed();
  const platformBalance = await revenueDistribution.getPlatformBalance();
  
  console.log('   - Admin:', admin.toString());
  console.log('   - Total Distributed:', totalDistributed.toString());
  console.log('   - Platform Balance:', platformBalance.toString());
}




