import { toNano } from '@ton/core';
import { LoyaltyToken, createJettonContent } from '../wrappers/LoyaltyToken';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const loyaltyTokenCode = await compile('LoyaltyToken');
  const jettonWalletCode = await compile('JettonWallet');

  const content = createJettonContent({
    name: 'Sweet Loyalty Points',
    symbol: 'SWEET',
    description: 'Loyalty points for Confectionery Partner Network',
    image: 'https://example.com/logo.png',
    decimals: 9,
  });

  const loyaltyToken = provider.open(
    LoyaltyToken.createFromConfig(
      {
        totalSupply: 0n,
        adminAddress: provider.sender().address!,
        content,
        jettonWalletCode,
      },
      loyaltyTokenCode
    )
  );

  await loyaltyToken.sendDeploy(provider.sender(), toNano('0.5'));

  await provider.waitForDeploy(loyaltyToken.address);

  console.log('✅ LoyaltyToken deployed at:', loyaltyToken.address.toString());
  console.log('📋 Jetton data:');

  const data = await loyaltyToken.getJettonData();
  console.log('   - Total Supply:', data.totalSupply.toString());
  console.log('   - Mintable:', data.mintable);
  console.log('   - Admin:', data.adminAddress.toString());
}




