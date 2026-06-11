import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4, internal, toNano, beginCell, Address } from '@ton/ton';
import { config } from '../config';
import { tonClient } from '../services/ton';
import { logger } from '../utils/logger';
import { successResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { prisma } from '../utils/prisma';

const mintSchema = z.object({
  targetWallet: z.string().describe('TON Wallet address of the user'),
  amount: z.number().min(1).describe('Amount of tokens to mint'),
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryFn<T>(fn: () => Promise<T>, retries: number = 5, delayMs: number = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: unknown) {
            const e = err instanceof Error ? err : new Error(String(err));
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 429 || e.message?.includes('429')) {
                logger.warn(`Rate limited (429), waiting ${delayMs / 1000}s before retry ${i + 1}/${retries}...`);
                await sleep(delayMs);
                delayMs *= 2; // exponential backoff
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded for TON API');
}

export const mintLoyaltyTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetWallet, amount } = mintSchema.parse(req.body);

    if (!config.ton.adminMnemonic) {
      throw new AppError('Admin mnemonic is not configured', 500);
    }

    if (!config.ton.contracts.loyaltyToken) {
      throw new AppError('Loyalty Token contract address is not configured', 500);
    }

    logger.info(`Starting mint procedure: Minting ${amount} SWEET to ${targetWallet}`);

    // Parse mnemonic
    const mnemonic = config.ton.adminMnemonic.split(' ');
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    // Create wallet contract instance
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const walletContract = tonClient.open(wallet);

    const seqno = await retryFn(() => walletContract.getSeqno());
    
    // TEP-74 Mint payload
    // OP Code for mint in our contract is 0x642b7d07
    const amountToMint = toNano(amount);
    
    const mintPayload = beginCell()
      .storeUint(0x642b7d07, 32) // op::mint
      .storeUint(0, 64)  // query_id
      .storeAddress(targetWallet.includes(':') ? Address.parseRaw(targetWallet) : Address.parse(targetWallet)) // to_address
      .storeCoins(amountToMint) // amount
      .storeRef(
        beginCell() // forward_payload (empty or default for simple mint)
          .storeUint(0, 32)
          .storeStringTail('Minted via Sweet Loyalty Platform')
          .endCell()
      )
      .endCell();

    // Send the transaction to the Jetton Master (LoyaltyToken) contract
    await retryFn(() => walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno: seqno,
      messages: [
        internal({
          to: Address.parse(config.ton.contracts.loyaltyToken),
          value: toNano('0.05'), // enough TON to cover gas fees for minting
          body: mintPayload,
        }),
      ],
    }));

    logger.info(`Mint transaction broadcasted successfully. Seqno: ${seqno}`);

    // Update DB balance so frontend shows correct amount immediately
    try {
      const parsedAddr = targetWallet.includes(':') ? Address.parseRaw(targetWallet) : Address.parse(targetWallet);
      const rawAddr = parsedAddr.toRawString();
      const friendlyAddr = parsedAddr.toString({ bounceable: true, testOnly: true });

      const partner = await prisma.partner.findFirst({
        where: {
          OR: [
            { walletAddress: targetWallet },
            { walletAddress: rawAddr },
            { walletAddress: friendlyAddr },
          ],
        },
      });

      if (partner) {
        await prisma.loyaltyPoints.upsert({
          where: { partnerId: partner.id },
          update: {
            balance: { increment: BigInt(amount) },
            lifetimeEarned: { increment: BigInt(amount) },
          },
          create: {
            partnerId: partner.id,
            balance: BigInt(amount),
            lifetimeEarned: BigInt(amount),
            lifetimeRedeemed: 0n,
          },
        });
        logger.info(`DB balance updated for partner ${partner.companyName}: +${amount} SWEET`);
      } else {
        logger.warn(`No partner found in DB for wallet ${targetWallet}, blockchain mint still succeeded`);
      }
    } catch (dbErr) {
      logger.warn('Failed to update DB after mint (non-critical, blockchain mint succeeded):', dbErr);
    }

    // Notify the target wallet in real-time via Socket.io
    io.to(`wallet:${targetWallet}`).emit('tokens:received', {
      amount,
      txSeqno: seqno,
      message: `+${amount} SWEET tokens minted to your wallet!`,
      timestamp: Date.now(),
    });

    return successResponse(
      res,
      {
        targetWallet,
        amount,
        status: 'Transaction Broadcasted',
        message: 'Tokens are being minted and should appear in your wallet shortly (+- 10 seconds)',
      },
      'Mint transaction sent to blockchain'
    );
  } catch (error) {
    logger.error('Failed to mint tokens:', error);
    return next(error);
  }
};
