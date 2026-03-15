import { Request, Response } from 'express';
import { Address, beginCell, internal, storeMessage, TonClient } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { z } from 'zod';
import { config } from '../config';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

// Standard TEP-74 transfer opcode
const Opcodes = {
  transfer: 0xf8a7ea5,
};

const transferSchema = z.object({
  clientWallet: z.string().min(48).max(66), // Allow both Base64 (48 chars) and Raw HEX (66 chars)
  amount: z.number().positive(),
});

// Helper for retry logic
const retryFn = async <T,>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error?.response?.status === 429) {
      logger.warn(`Rate limited (429), waiting ${delay / 1000}s before retry ${6 - retries}/5...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryFn(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
    throw error;
  }
};

export const transferLoyaltyTokens = async (req: Request, res: Response) => {
  try {
    const validatedData = transferSchema.parse(req.body);
    const { clientWallet, amount } = validatedData;
    const { adminMnemonic, jettonDecimals, contracts, endpoint, apiKey } = config.ton;

    if (!adminMnemonic) {
      return errorResponse(res, 'Admin mnemonic not configured in environment', 'CONFIG_ERROR');
    }
    if (!contracts.loyaltyToken) {
      return errorResponse(res, 'LoyaltyToken master contract address not configured', 'CONFIG_ERROR');
    }

    const client = new TonClient({
      endpoint,
      apiKey,
    });

    const keyPair = await mnemonicToPrivateKey(adminMnemonic.split(' '));
    const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
    const contract = client.open(wallet);
    const demoPartnerOwnerAddress = wallet.address;

    logger.info(`Starting B2B2C transfer procedure: Sending ${amount} SWEET to client ${clientWallet} from Demo Partner Treasury ${demoPartnerOwnerAddress.toString()}`);

    // Convert amount to nano-units
    const amountNano = BigInt(amount * Math.pow(10, jettonDecimals));

    // 1. Get the Partner's Jetton Wallet Address from the Master Contract
    const masterAddress = Address.parse(contracts.loyaltyToken);
    
    // We need to fetch the jetton wallet address for our Demo Partner.
    // Equivalent roughly to calling the get_wallet_address getter.
    // Instead of doing manual cell parsing which is complex, we will send the message using a generic runMethod.
    let partnerJettonWalletAddress: Address;
    
    try {
       const partnerAddressCell = beginCell().storeAddress(demoPartnerOwnerAddress).endCell();
       
       const { stack } = await retryFn(() => 
          client.runMethod(masterAddress, 'get_wallet_address', [{ type: 'slice', cell: partnerAddressCell }])
       );
       
       partnerJettonWalletAddress = stack.readAddress();
       logger.info(`Resolved Partner's Jetton Wallet Address: ${partnerJettonWalletAddress.toString()}`);
    } catch (err: any) {
       logger.error('Failed to resolve Partner Jetton Wallet Address from Master', err);
       return errorResponse(res, 'Failed to resolve sender Jetton Wallet', 'BLOCKCHAIN_ERROR', 500, err.message);
    }

    // 2. Prepare the transfer message to the Partner's Jetton Wallet
    const toAddress = clientWallet.includes(':') 
      ? Address.parseRaw(clientWallet) 
      : Address.parse(clientWallet);
    const forwardPayload = beginCell()
        .storeUint(0, 32) // text comment flag
        .storeStringTail("Kaspi cashback")
        .endCell();

    const transferBody = beginCell()
      .storeUint(Opcodes.transfer, 32)
      .storeUint(0, 64) // query_id
      .storeCoins(amountNano)
      .storeAddress(toAddress)
      .storeAddress(demoPartnerOwnerAddress) // response destination
      .storeBit(0) // no custom payload
      .storeCoins(1n) // forward_ton_amount (1 nanoton for notification)
      .storeBit(1) // we store forwardPayload as a reference
      .storeRef(forwardPayload)
      .endCell();

    // 3. Send the transfer transaction
    const seqno = await retryFn(() => contract.getSeqno());
    
    await retryFn(() =>
      contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
          internal({
            to: partnerJettonWalletAddress,
            value: '0.05', // Fee for transfer execution
            bounce: true,
            body: transferBody,
          }),
        ],
      })
    );

    logger.info(`Transfer transaction broadcasted successfully. Seqno: ${seqno}`);

    return successResponse(res, {
      status: 'Transaction Broadcasted',
      details: {
        fromOwner: demoPartnerOwnerAddress.toString(),
        fromJettonWallet: partnerJettonWalletAddress.toString(),
        toClient: toAddress.toString(),
        amount: amount,
        seqno: seqno
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, 'Invalid request data', 'VALIDATION_ERROR', 400, error.errors);
    }

    logger.error('Error during token transfer:', error);
    return errorResponse(res, 'Failed to broadcast transfer transaction', 'BLOCKCHAIN_ERROR', 500, error.message);
  }
};
