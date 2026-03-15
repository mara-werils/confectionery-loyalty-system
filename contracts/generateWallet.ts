import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import * as fs from 'fs';

async function main() {
    try {
        const mnemonic = await mnemonicNew();
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        
        console.log('--- NEW WALLET GENERATED ---');
        console.log('Address (testnet):', wallet.address.toString({ testOnly: true }));
        console.log('Mnemonic:', mnemonic.join(' '));
        console.log('----------------------------');
        
        // Write to .env
        const envContent = `WALLET_MNEMONIC="${mnemonic.join(' ')}"\nWALLET_VERSION=v4r2\n`;
        fs.writeFileSync('.env', envContent);
        console.log('.env file updated.');
    } catch (e) {
        console.error(e);
    }
}

main();
