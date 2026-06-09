/**
 * Sweet Pass off-chain SWEET ledger.
 *
 * In the gasless model the customer's spendable SWEET lives in LoyaltyPoints.balance
 * (whole SWEET, pegged 1:1 to KZT). Prepaying debits this ledger and the treasury
 * funds the escrow on-chain; a refund credits it back. The on-chain SWEET movement
 * (treasury -> escrow -> partner/treasury) is the settlement layer.
 */
import { Address } from '@ton/core';
import { prisma } from '../utils/prisma';

/** All address spellings a wallet might be stored under (raw + friendly testnet forms). */
function addressVariants(wallet: string): string[] {
  const set = new Set<string>([wallet]);
  try {
    const a = wallet.includes(':') ? Address.parseRaw(wallet) : Address.parse(wallet);
    set.add(a.toRawString());
    set.add(a.toString({ bounceable: true, testOnly: true }));
    set.add(a.toString({ bounceable: false, testOnly: true }));
  } catch {
    /* not a parseable address — fall back to the raw string */
  }
  return [...set];
}

export async function findCustomerPartnerId(wallet: string): Promise<string | null> {
  const partner = await prisma.partner.findFirst({
    where: { walletAddress: { in: addressVariants(wallet) } },
    select: { id: true },
  });
  return partner?.id ?? null;
}

/** Current spendable SWEET balance (whole SWEET) for a customer wallet. */
export async function getSweetBalance(wallet: string): Promise<bigint> {
  const partnerId = await findCustomerPartnerId(wallet);
  if (!partnerId) return 0n;
  const lp = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
  return lp?.balance ?? 0n;
}

/**
 * Atomically debit `amount` SWEET if the balance covers it. Returns false when the
 * customer is unknown or has insufficient balance — the conditional updateMany makes
 * this race-safe against concurrent spends.
 */
export async function debitSweet(wallet: string, amount: bigint): Promise<boolean> {
  const partnerId = await findCustomerPartnerId(wallet);
  if (!partnerId) return false;
  const result = await prisma.loyaltyPoints.updateMany({
    where: { partnerId, balance: { gte: amount } },
    data: { balance: { decrement: amount }, lifetimeRedeemed: { increment: amount } },
  });
  return result.count === 1;
}

/** Credit `amount` SWEET back to a customer (refund or rollback of a failed deposit). */
export async function creditSweet(wallet: string, amount: bigint): Promise<void> {
  const partnerId = await findCustomerPartnerId(wallet);
  if (!partnerId) return;
  await prisma.loyaltyPoints.upsert({
    where: { partnerId },
    update: { balance: { increment: amount } },
    create: { partnerId, balance: amount, lifetimeEarned: 0n, lifetimeRedeemed: 0n },
  });
}
