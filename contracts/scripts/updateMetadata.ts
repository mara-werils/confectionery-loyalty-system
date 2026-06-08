import { mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4, internal, toNano, beginCell, Dictionary, Cell } from '@ton/ton';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ── TEP-64 On-chain metadata builder ──────────────────────────────────
function sha256(str: string): bigint {
    return BigInt('0x' + createHash('sha256').update(str).digest('hex'));
}

function buildOnchainMetadata(data: Record<string, string>): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    for (const [key, value] of Object.entries(data)) {
        dict.set(sha256(key), beginCell().storeUint(0x00, 8).storeStringTail(value).endCell());
    }

    return beginCell().storeUint(0x00, 8).storeDict(dict).endCell();
}

// ── Helpers ───────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function retry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try { return await fn(); }
        catch (e: any) {
            if (i === retries - 1) throw e;
            console.log(`   ⏳ Rate limited, retry ${i + 1}/${retries} in ${delay / 1000}s...`);
            await sleep(delay);
            delay *= 2;
        }
    }
    throw new Error('unreachable');
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
    console.log('🔄 Updating LoyaltyToken metadata...\n');

    // Load mnemonic
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const mnemonicMatch = envContent.match(/WALLET_MNEMONIC="([^"]+)"/);
    if (!mnemonicMatch) throw new Error('WALLET_MNEMONIC not found in .env');
    const mnemonic = mnemonicMatch[1]!.split(' ');

    // Load deployed addresses
    const deployed = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'deployed.json'), 'utf-8')
    );
    const loyaltyTokenAddr = deployed.contracts.LoyaltyToken;
    console.log('📍 LoyaltyToken:', loyaltyTokenAddr);

    // Create wallet
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });

    const walletContract = client.open(wallet);
    const seqno = await retry(() => walletContract.getSeqno());

    // Build proper TEP-64 on-chain metadata
    const newContent = buildOnchainMetadata({
        name: 'Sweet Loyalty Points',
        symbol: 'SWEET',
        description: 'Loyalty points for Confectionery Partner Network',
        decimals: '9',
        image: 'https://raw.githubusercontent.com/mara-werils/confectionery-loyalty-system/main/frontend/public/logo.png',
    });

    // Send changeContent (opcode 0x5773d1f5)
    const body = beginCell()
        .storeUint(0x5773d1f5, 32) // changeContent opcode
        .storeUint(0, 64)          // queryId
        .storeRef(newContent)
        .endCell();

    await retry(() => walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
            internal({
                to: loyaltyTokenAddr,
                value: toNano('0.05'),
                body,
            }),
        ],
    }));

    console.log('📤 changeContent TX sent! seqno:', seqno);
    console.log('⏳ Wait ~15s, then check:');
    console.log(`   https://testnet.tonviewer.com/${loyaltyTokenAddr}`);
}

main().catch(console.error);
