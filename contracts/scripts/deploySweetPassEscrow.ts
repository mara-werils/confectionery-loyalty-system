import { toNano, Address } from '@ton/core';
import { SweetPassEscrow } from '../wrappers/SweetPassEscrow';
import { compile, NetworkProvider } from '@ton/blueprint';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function run(provider: NetworkProvider, args: string[]) {
  const escrowCode = await compile('SweetPassEscrow');
  // The escrow MUST use the exact same jetton wallet code as the SWEET master,
  // otherwise the derived escrow jetton wallet address will not match the real one.
  const jettonWalletCode = await compile('JettonWallet');

  const deployedPath = join(__dirname, '..', 'deployed.json');
  const deployed = JSON.parse(readFileSync(deployedPath, 'utf-8'));

  // SWEET jetton master = the LoyaltyToken contract.
  const jettonMasterAddress = args[0]
    ? Address.parse(args[0])
    : Address.parse(deployed.contracts.LoyaltyToken);

  const escrow = provider.open(
    SweetPassEscrow.createFromConfig(
      {
        adminAddress: provider.sender().address!,
        jettonMasterAddress,
        jettonWalletCode,
      },
      escrowCode
    )
  );

  await escrow.sendDeploy(provider.sender(), toNano('0.5'));
  await provider.waitForDeploy(escrow.address);

  const admin = await escrow.getAdmin();
  const orderCount = await escrow.getOrderCount();
  const escrowJettonWallet = await escrow.getEscrowJettonWallet();

  console.log('✅ SweetPassEscrow deployed at:', escrow.address.toString());
  console.log('📋 Escrow data:');
  console.log('   - Admin:', admin.toString());
  console.log('   - SWEET master:', jettonMasterAddress.toString());
  console.log('   - Escrow jetton wallet:', escrowJettonWallet.toString());
  console.log('   - Order count:', orderCount.toString());

  // Persist the address so the backend / frontend can reference it.
  deployed.contracts.SweetPassEscrow = escrow.address.toString();
  deployed.sweetPassEscrowJettonWallet = escrowJettonWallet.toString();
  deployed.deployedAt = new Date().toISOString();
  writeFileSync(deployedPath, JSON.stringify(deployed, null, 2) + '\n');
  console.log('💾 Updated deployed.json');
}
