/**
 * Deploy SweetAchievementCollection to TON testnet.
 *
 * Usage:
 *   cd contracts
 *   npx blueprint run deploySBTCollection --testnet
 *
 * After deploy the script prints the collection address.
 * Add it to backend/.env:  NFT_COLLECTION_ADDRESS=<address>
 */

import { toNano } from '@ton/core';
import { SweetAchievementCollection } from '../wrappers/SweetAchievementCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();

  ui.write('=== Deploying SweetAchievementCollection ===');

  const senderAddress = provider.sender().address;
  if (!senderAddress) {
    throw new Error('Sender address is not available');
  }

  ui.write(`Owner (backend wallet): ${senderAddress.toString()}`);

  const collection = provider.open(
    await SweetAchievementCollection.fromInit(senderAddress)
  );

  ui.write(`Computed address: ${collection.address.toString()}`);
  ui.write('Deploying...');

  await collection.send(
    provider.sender(),
    { value: toNano('0.15') },
    { $$type: 'Deploy', queryId: 0n }
  );

  await provider.waitForDeploy(collection.address);

  const data = await collection.getCollectionData();

  ui.write('');
  ui.write('✅ SweetAchievementCollection deployed successfully!');
  ui.write(`   Address:         ${collection.address.toString()}`);
  ui.write(`   Owner:           ${data.owner.toString()}`);
  ui.write(`   Next item index: ${data.next_item_index}`);
  ui.write('');
  ui.write('Add to backend/.env:');
  ui.write(`   NFT_COLLECTION_ADDRESS=${collection.address.toString()}`);
}
