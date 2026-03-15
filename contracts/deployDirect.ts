import { mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4, internal, toNano, Cell, beginCell, Address, contractAddress, StateInit } from '@ton/ton';
import * as fs from 'fs';
import * as path from 'path';

// Load compiled contract BOCs
function loadCompiled(name: string): Cell {
    const filePath = path.join(__dirname, 'build', `${name}.compiled.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Cell.fromBoc(Buffer.from(data.hex, 'hex'))[0]!;
}

// Create jetton content cell (simple on-chain)
function createJettonContent(params: { name: string; symbol: string; description: string; decimals: number }): Cell {
    return beginCell()
        .storeUint(0x00, 8) // on-chain prefix
        .storeStringTail(JSON.stringify({
            name: params.name,
            symbol: params.symbol,
            description: params.description,
            decimals: params.decimals.toString(),
        }))
        .endCell();
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryFn<T>(fn: () => Promise<T>, retries: number = 5, delayMs: number = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            if (e?.response?.status === 429 || e?.message?.includes('429')) {
                console.log(`   ⏳ Rate limited, waiting ${delayMs / 1000}s before retry ${i + 1}/${retries}...`);
                await sleep(delayMs);
                delayMs *= 2; // exponential backoff
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

async function waitForContract(client: TonClient, address: Address, timeout: number = 90000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const state = await retryFn(() => client.getContractState(address));
            if (state.state === 'active') {
                console.log(`   ✅ Contract deployed at ${address.toString({ testOnly: true })}`);
                return true;
            }
        } catch (e) {
            // ignore
        }
        await sleep(5000);
    }
    console.log(`   ⚠️ Timeout waiting for contract at ${address.toString({ testOnly: true })}`);
    return false;
}

async function main() {
    console.log('🚀 Starting deployment of Confectionery Loyalty System...\n');

    // Load mnemonic from .env
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const mnemonicMatch = envContent.match(/WALLET_MNEMONIC="([^"]+)"/);
    if (!mnemonicMatch) {
        throw new Error('WALLET_MNEMONIC not found in .env');
    }
    const mnemonic = mnemonicMatch[1]!.split(' ');

    // Create wallet
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

    // Create TonClient with toncenter (no API key, free tier with rate limiting)
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });

    const walletContract = client.open(wallet);
    const adminAddress = wallet.address;

    console.log('👤 Admin address:', adminAddress.toString({ testOnly: true }));

    // Check balance with retry
    const balance = await retryFn(() => walletContract.getBalance());
    console.log('💰 Balance:', Number(balance) / 1e9, 'TON\n');

    if (balance < toNano('0.5')) {
        throw new Error('Insufficient balance. Need at least 0.5 TON');
    }

    // Load compiled contracts
    console.log('📦 Loading compiled contracts...');
    const loyaltyTokenCode = loadCompiled('LoyaltyToken');
    const jettonWalletCode = loadCompiled('JettonWallet');
    const partnerRegistryCode = loadCompiled('PartnerRegistry');
    const redemptionManagerCode = loadCompiled('RedemptionManager');
    const revenueDistributionCode = loadCompiled('RevenueDistribution');
    console.log('✅ All contracts loaded\n');

    let seqno = await retryFn(() => walletContract.getSeqno());

    // 1. Deploy LoyaltyToken
    console.log('1️⃣  Deploying LoyaltyToken...');
    const content = createJettonContent({
        name: 'Sweet Loyalty Points',
        symbol: 'SWEET',
        description: 'Loyalty points for Confectionery Partner Network',
        decimals: 9,
    });

    const loyaltyTokenData = beginCell()
        .storeCoins(0) // total_supply
        .storeAddress(adminAddress)
        .storeRef(content)
        .storeRef(jettonWalletCode)
        .endCell();

    const loyaltyTokenInit: StateInit = { code: loyaltyTokenCode, data: loyaltyTokenData };
    const loyaltyTokenAddress = contractAddress(0, loyaltyTokenInit);

    await retryFn(() => walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno: seqno,
        messages: [internal({
            to: loyaltyTokenAddress,
            value: toNano('0.3'),
            init: loyaltyTokenInit,
            body: beginCell().endCell(),
        })],
    }));
    console.log(`   📤 TX sent, waiting...`);
    await waitForContract(client, loyaltyTokenAddress);
    seqno++;
    await sleep(8000);

    // 2. Deploy PartnerRegistry
    console.log('2️⃣  Deploying PartnerRegistry...');
    const partnerRegistryData = beginCell()
        .storeAddress(adminAddress)
        .endCell();

    const partnerRegistryInit: StateInit = { code: partnerRegistryCode, data: partnerRegistryData };
    const partnerRegistryAddress = contractAddress(0, partnerRegistryInit);

    await retryFn(() => walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno: seqno,
        messages: [internal({
            to: partnerRegistryAddress,
            value: toNano('0.3'),
            init: partnerRegistryInit,
            body: beginCell().endCell(),
        })],
    }));
    console.log(`   📤 TX sent, waiting...`);
    await waitForContract(client, partnerRegistryAddress);
    seqno++;
    await sleep(8000);

    // 3. Deploy RedemptionManager
    console.log('3️⃣  Deploying RedemptionManager...');
    const redemptionManagerData = beginCell()
        .storeAddress(adminAddress)
        .storeAddress(loyaltyTokenAddress)
        .endCell();

    const redemptionManagerInit: StateInit = { code: redemptionManagerCode, data: redemptionManagerData };
    const redemptionManagerAddress = contractAddress(0, redemptionManagerInit);

    await retryFn(() => walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno: seqno,
        messages: [internal({
            to: redemptionManagerAddress,
            value: toNano('0.3'),
            init: redemptionManagerInit,
            body: beginCell().endCell(),
        })],
    }));
    console.log(`   📤 TX sent, waiting...`);
    await waitForContract(client, redemptionManagerAddress);
    seqno++;
    await sleep(8000);

    // 4. Deploy RevenueDistribution
    console.log('4️⃣  Deploying RevenueDistribution...');
    const revenueDistributionData = beginCell()
        .storeAddress(adminAddress)
        .storeAddress(partnerRegistryAddress)
        .endCell();

    const revenueDistributionInit: StateInit = { code: revenueDistributionCode, data: revenueDistributionData };
    const revenueDistributionAddress = contractAddress(0, revenueDistributionInit);

    await retryFn(() => walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno: seqno,
        messages: [internal({
            to: revenueDistributionAddress,
            value: toNano('0.3'),
            init: revenueDistributionInit,
            body: beginCell().endCell(),
        })],
    }));
    console.log(`   📤 TX sent, waiting...`);
    await waitForContract(client, revenueDistributionAddress);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nContract Addresses:');
    console.log('-------------------');
    console.log('LoyaltyToken:        ', loyaltyTokenAddress.toString({ testOnly: true }));
    console.log('PartnerRegistry:     ', partnerRegistryAddress.toString({ testOnly: true }));
    console.log('RedemptionManager:   ', redemptionManagerAddress.toString({ testOnly: true }));
    console.log('RevenueDistribution: ', revenueDistributionAddress.toString({ testOnly: true }));
    console.log('\n💡 Save these addresses for backend configuration!');

    // Save to deployed.json
    const deployed = {
        network: 'testnet',
        adminAddress: adminAddress.toString({ testOnly: true }),
        contracts: {
            LoyaltyToken: loyaltyTokenAddress.toString({ testOnly: true }),
            PartnerRegistry: partnerRegistryAddress.toString({ testOnly: true }),
            RedemptionManager: redemptionManagerAddress.toString({ testOnly: true }),
            RevenueDistribution: revenueDistributionAddress.toString({ testOnly: true }),
        },
        deployedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(__dirname, 'deployed.json'), JSON.stringify(deployed, null, 2));
    console.log('\n📝 Saved addresses to deployed.json');
}

main().catch(console.error);
