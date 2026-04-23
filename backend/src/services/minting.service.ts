import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { config } from '../config';
import { tonClient } from './ton';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryFn<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as { response?: { status: number }; message?: string };
      if (e?.response?.status === 429 || e?.message?.includes('429')) {
        logger.warn(`Rate limited (429), retrying in ${delayMs / 1000}s (${i + 1}/${retries})...`);
        await sleep(delayMs);
        delayMs *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded for TON API');
}

async function mintOnChain(targetWallet: string, amount: number): Promise<string> {
  if (!config.ton.adminMnemonic) throw new Error('Admin mnemonic not configured');
  if (!config.ton.contracts.loyaltyToken) throw new Error('LoyaltyToken address not configured');

  const mnemonic = config.ton.adminMnemonic.split(' ');
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const walletContract = tonClient.open(wallet);

  const seqno = await retryFn(() => walletContract.getSeqno());
  const amountToMint = toNano(amount);

  const mintPayload = beginCell()
    .storeUint(0x642b7d07, 32) // op::mint
    .storeUint(0, 64)
    .storeAddress(targetWallet.includes(':') ? Address.parseRaw(targetWallet) : Address.parse(targetWallet))
    .storeCoins(amountToMint)
    .storeRef(
      beginCell()
        .storeUint(0, 32)
        .storeStringTail('Minted via Sweet Loyalty Platform')
        .endCell()
    )
    .endCell();

  await retryFn(() =>
    walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        internal({
          to: Address.parse(config.ton.contracts.loyaltyToken!),
          value: toNano('0.05'),
          body: mintPayload,
        }),
      ],
    })
  );

  return `seqno:${seqno}`;
}

export class MintingService {
  private static instance: MintingService;

  private constructor() {}

  public static getInstance(): MintingService {
    if (!MintingService.instance) {
      MintingService.instance = new MintingService();
    }
    return MintingService.instance;
  }

  public async mintTokens(
    amount: number,
    partnerId: string,
    customerId?: string,
    customerWallet?: string
  ): Promise<void> {
    logger.info('------------------------------------------------');
    logger.info('MINTING SERVICE TRIGGERED');
    logger.info(`Amount: ${amount} SWEET | Partner: ${partnerId} | Customer: ${customerId || 'Anonymous'}`);

    const customerShare = Math.floor(amount * 0.9);
    const partnerShare = Math.floor(amount * 0.05);
    const treasuryShare = amount - customerShare - partnerShare;

    logger.info(`Distribution: Customer=${customerShare}, Partner=${partnerShare}, Treasury=${treasuryShare}`);

    if (customerWallet && customerShare > 0) {
      try {
        const txRef = await mintOnChain(customerWallet, customerShare);
        logger.info(`On-chain mint to customer wallet ${customerWallet}: ${txRef}`);
      } catch (err) {
        logger.error('On-chain mint failed, distribution recorded off-chain only:', err);
      }
    } else {
      logger.info('No customer wallet provided — distribution recorded off-chain only.');
    }

    logger.info('Minting complete.');
    logger.info('------------------------------------------------');
  }
}
