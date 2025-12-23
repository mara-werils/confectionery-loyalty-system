import { toNano } from '@ton/core';
import { PartnerRegistry } from '../wrappers/PartnerRegistry';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const partnerRegistryCode = await compile('PartnerRegistry');

  const partnerRegistry = provider.open(
    PartnerRegistry.createFromConfig(
      {
        adminAddress: provider.sender().address!,
      },
      partnerRegistryCode
    )
  );

  await partnerRegistry.sendDeploy(provider.sender(), toNano('0.5'));

  await provider.waitForDeploy(partnerRegistry.address);

  console.log('✅ PartnerRegistry deployed at:', partnerRegistry.address.toString());
  console.log('📋 Registry data:');

  const admin = await partnerRegistry.getAdmin();
  const count = await partnerRegistry.getPartnerCount();
  
  console.log('   - Admin:', admin.toString());
  console.log('   - Partner Count:', count.toString());
}




