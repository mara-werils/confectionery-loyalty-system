import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Address } from '@ton/core';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { posRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  getOnChainOrder,
  depositToEscrowOnChain,
  confirmOnChainStatus,
  releaseOnChain,
  refundOnChain,
  OnChainStatus,
} from '../services/escrow.service';
import { debitSweet, creditSweet, getSweetBalance } from '../services/sweetpassLedger';

const router = Router();

const DECIMALS = config.ton.jettonDecimals; // 9 — SWEET pegged 1:1 to KZT
const NANO = 10n ** BigInt(DECIMALS);

/** Convert KZT (integer) to nano-SWEET. 1 SWEET = 1 KZT. */
function kztToNano(kzt: number | bigint): bigint {
  return BigInt(kzt) * NANO;
}

/** Generate a unique uint64-safe on-chain order id. */
function generateOrderId(): bigint {
  return BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
}

function normalizeAddress(addr: string): string {
  try {
    return Address.parse(addr).toRawString();
  } catch {
    return addr;
  }
}

// ============================================================================
// CREATE PRE-ORDER  (gasless: debit the customer's SWEET ledger, then the
// treasury funds the escrow on-chain — no wallet, gas or testnet for the customer)
// ============================================================================
const createSchema = z.object({
  partnerId: z.string().min(1), // the confectionery being ordered from
  itemDescription: z.string().min(1).max(200),
  amountKzt: z.number().int().positive().max(10_000_000),
  deadlineHours: z.number().int().positive().max(24 * 30).default(24),
});

router.post('/orders', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const customerWallet = req.user!.walletAddress;

    if (!config.ton.contracts.sweetPassEscrow || !config.ton.contracts.loyaltyToken) {
      throw new AppError('Sweet Pass is not available right now', 503, 'ESCROW_UNCONFIGURED');
    }

    const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
    if (!partner) throw new AppError('Confectionery not found', 404, 'NOT_FOUND');

    // A customer cannot place a Sweet Pass order with themselves.
    if (normalizeAddress(partner.walletAddress) === normalizeAddress(customerWallet)) {
      throw new AppError('Cannot pre-order from your own shop', 400, 'SELF_ORDER');
    }

    const deadline = new Date(Date.now() + data.deadlineHours * 3600 * 1000);
    const deadlineUnix = Math.floor(deadline.getTime() / 1000);
    const amount = kztToNano(data.amountKzt);
    const amountKzt = BigInt(data.amountKzt);

    // 1. Debit the customer's spendable SWEET (atomic, race-safe). 1 SWEET = 1 KZT.
    const debited = await debitSweet(customerWallet, amountKzt);
    if (!debited) {
      const have = await getSweetBalance(customerWallet);
      throw new AppError(
        `Not enough SWEET — you have ${have.toString()}, this order needs ${amountKzt.toString()}`,
        400,
        'INSUFFICIENT_BALANCE'
      );
    }

    // 2. Generate a collision-free on-chain order id and reserve the order.
    let orderId = generateOrderId();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.preOrder.findUnique({ where: { orderId } });
      if (!existing) break;
      orderId = generateOrderId();
    }

    const preOrder = await prisma.preOrder.create({
      data: {
        orderId,
        customerWallet,
        partnerId: partner.id,
        partnerWallet: partner.walletAddress,
        itemDescription: data.itemDescription,
        amount,
        amountKzt,
        deadline,
        status: 'PENDING_DEPOSIT',
      },
    });

    // 3. Treasury funds the escrow on-chain, then confirm the FUNDED transition.
    try {
      await depositToEscrowOnChain({
        orderId,
        partnerWallet: partner.walletAddress,
        deadline: deadlineUnix,
        amountNano: amount,
      });
      const funded = await confirmOnChainStatus(orderId, OnChainStatus.Funded, 60000);
      if (!funded) throw new Error('escrow did not report FUNDED in time');
    } catch (err) {
      // Roll back: re-credit the customer and drop the unfunded order so it is never
      // picked up by the confirmation sweep. The treasury's own SWEET (if it did land
      // late) auto-refunds to the treasury after the deadline — no customer charge.
      await creditSweet(customerWallet, amountKzt);
      await prisma.preOrder.delete({ where: { orderId } }).catch((): void => undefined);
      logger.error(`[SweetPass] gasless deposit failed for order=${orderId}:`, err);
      throw new AppError(
        'Prepayment could not be settled on-chain — your balance was not charged. Please try again.',
        502,
        'DEPOSIT_FAILED'
      );
    }

    // 4. Flip to FUNDED (idempotent vs the sweep) and announce in real time.
    const flip = await prisma.preOrder.updateMany({
      where: { orderId, status: 'PENDING_DEPOSIT' },
      data: { status: 'FUNDED', fundedAt: new Date() },
    });
    if (flip.count === 1) {
      io.to(`wallet:${customerWallet}`).emit('sweetpass:funded', {
        orderId: orderId.toString(),
        amountKzt: data.amountKzt,
        item: preOrder.itemDescription,
      });
      io.to(`partner:${partner.id}`).emit('sweetpass:funded', {
        orderId: orderId.toString(),
        amountKzt: data.amountKzt,
        item: preOrder.itemDescription,
      });
      io.emit('activity:new', {
        type: 'sweetpass_funded',
        message: `New Sweet Pass pre-order locked: ${preOrder.itemDescription} (${data.amountKzt} KZT)`,
        amount: data.amountKzt,
        timestamp: new Date().toISOString(),
      });
    }

    return successResponse(res, {
      id: preOrder.id,
      orderId: orderId.toString(),
      partnerName: partner.companyName,
      itemDescription: preOrder.itemDescription,
      amountKzt: data.amountKzt,
      deadline: preOrder.deadline.toISOString(),
      status: 'FUNDED',
    }, 'Prepaid — locked in escrow');
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// CONFIRM DEPOSIT  (poll the chain; flip to FUNDED once the escrow holds it)
// ============================================================================
const confirmSchema = z.object({
  txHash: z.string().optional(),
});

router.post('/orders/:orderId/confirm-deposit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { txHash } = confirmSchema.parse(req.body ?? {});
    const orderId = BigInt(req.params.orderId!);

    const preOrder = await prisma.preOrder.findUnique({ where: { orderId } });
    if (!preOrder) throw new AppError('Pre-order not found', 404, 'NOT_FOUND');

    if (preOrder.status === 'FUNDED') {
      return successResponse(res, { status: 'FUNDED', orderId: orderId.toString() }, 'Already funded');
    }
    if (preOrder.status !== 'PENDING_DEPOSIT') {
      throw new AppError(`Cannot confirm deposit in status ${preOrder.status}`, 400, 'BAD_STATUS');
    }

    // Source of truth: read the order straight from the escrow contract.
    const onchain = await getOnChainOrder(orderId);
    if (onchain.status !== OnChainStatus.Funded) {
      return successResponse(res, {
        status: preOrder.status,
        onChainStatus: onchain.status,
        funded: false,
      }, 'Deposit not yet visible on-chain');
    }

    const updated = await prisma.preOrder.update({
      where: { orderId },
      data: {
        status: 'FUNDED',
        fundedAt: new Date(),
        depositTxHash: txHash ?? null,
      },
    });

    // Real-time: notify the customer, the confectionery, and the public feed.
    io.to(`wallet:${preOrder.customerWallet}`).emit('sweetpass:funded', {
      orderId: orderId.toString(),
      amountKzt: Number(preOrder.amountKzt),
      item: preOrder.itemDescription,
    });
    io.to(`partner:${preOrder.partnerId}`).emit('sweetpass:funded', {
      orderId: orderId.toString(),
      amountKzt: Number(preOrder.amountKzt),
      item: preOrder.itemDescription,
    });
    io.emit('activity:new', {
      type: 'sweetpass_funded',
      message: `New Sweet Pass pre-order locked: ${preOrder.itemDescription} (${preOrder.amountKzt} KZT)`,
      amount: Number(preOrder.amountKzt),
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, {
      status: updated.status,
      orderId: orderId.toString(),
      fundedAt: updated.fundedAt?.toISOString(),
    }, 'Deposit confirmed on-chain');
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// RELEASE  (POS confirms fulfilment → escrow pays the confectionery)
// ============================================================================
router.post('/orders/:orderId/release', authenticate, posRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = BigInt(req.params.orderId!);
    const preOrder = await prisma.preOrder.findUnique({ where: { orderId } });
    if (!preOrder) throw new AppError('Pre-order not found', 404, 'NOT_FOUND');

    // Authorization: only the confectionery that owns the order, or an admin,
    // may confirm fulfilment. (Replay/double-release is also blocked on-chain.)
    const isOwningPartner = req.user!.type === 'partner' && req.user!.id === preOrder.partnerId;
    const isAdmin = req.user!.type === 'admin';
    if (!isOwningPartner && !isAdmin) {
      throw new AppError('Only the confectionery can confirm this order', 403, 'FORBIDDEN');
    }

    if (preOrder.status === 'RELEASED') {
      return successResponse(res, { status: 'RELEASED', orderId: orderId.toString() }, 'Already released');
    }
    if (preOrder.status !== 'FUNDED') {
      throw new AppError(`Cannot release an order in status ${preOrder.status}`, 400, 'BAD_STATUS');
    }

    // Fire the admin-signed on-chain release.
    const txRef = await releaseOnChain(orderId);

    const updated = await prisma.preOrder.update({
      where: { orderId },
      data: { status: 'RELEASED', releasedAt: new Date(), releaseTxHash: txRef },
    });

    io.to(`wallet:${preOrder.customerWallet}`).emit('sweetpass:released', {
      orderId: orderId.toString(),
      item: preOrder.itemDescription,
    });
    io.to(`partner:${preOrder.partnerId}`).emit('sweetpass:released', {
      orderId: orderId.toString(),
      amountKzt: Number(preOrder.amountKzt),
      item: preOrder.itemDescription,
    });
    io.emit('activity:new', {
      type: 'sweetpass_released',
      message: `Sweet Pass fulfilled: ${preOrder.itemDescription} (${preOrder.amountKzt} KZT paid out)`,
      amount: Number(preOrder.amountKzt),
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, {
      status: updated.status,
      orderId: orderId.toString(),
      releaseTxHash: txRef,
    }, 'Order released to the confectionery');
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// REFUND  (manual trigger; also driven by the deadline cron)
// ============================================================================
router.post('/orders/:orderId/refund', authenticate, posRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = BigInt(req.params.orderId!);
    const preOrder = await prisma.preOrder.findUnique({ where: { orderId } });
    if (!preOrder) throw new AppError('Pre-order not found', 404, 'NOT_FOUND');

    if (preOrder.status === 'REFUNDED') {
      return successResponse(res, { status: 'REFUNDED', orderId: orderId.toString() }, 'Already refunded');
    }
    if (preOrder.status !== 'FUNDED') {
      throw new AppError(`Cannot refund an order in status ${preOrder.status}`, 400, 'BAD_STATUS');
    }
    if (preOrder.deadline.getTime() > Date.now()) {
      throw new AppError('Refund is only available after the deadline', 400, 'DEADLINE_NOT_PASSED');
    }

    const txRef = await refundOnChain(orderId);

    const updated = await prisma.preOrder.update({
      where: { orderId },
      data: { status: 'REFUNDED', refundedAt: new Date(), refundTxHash: txRef },
    });

    // Custodial model: return the prepaid SWEET to the customer's spendable balance.
    await creditSweet(preOrder.customerWallet, preOrder.amountKzt);

    io.to(`wallet:${preOrder.customerWallet}`).emit('sweetpass:refunded', {
      orderId: orderId.toString(),
      amountKzt: Number(preOrder.amountKzt),
      item: preOrder.itemDescription,
    });
    io.to(`partner:${preOrder.partnerId}`).emit('sweetpass:refunded', {
      orderId: orderId.toString(),
      item: preOrder.itemDescription,
    });
    io.emit('activity:new', {
      type: 'sweetpass_refunded',
      message: `Sweet Pass auto-refunded: ${preOrder.itemDescription} (${preOrder.amountKzt} KZT returned)`,
      amount: Number(preOrder.amountKzt),
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, {
      status: updated.status,
      orderId: orderId.toString(),
      refundTxHash: txRef,
    }, 'Order refunded to the customer');
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// LIST MY ORDERS  (as customer and/or as confectionery)
// ============================================================================
router.get('/orders', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = req.user!.walletAddress;
    const partnerId = req.user!.type === 'partner' ? req.user!.id : undefined;

    const orders = await prisma.preOrder.findMany({
      where: {
        OR: [
          { customerWallet: wallet },
          ...(partnerId ? [{ partnerId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { partner: { select: { companyName: true } } },
    });

    return successResponse(res, orders.map((o) => ({
      id: o.id,
      orderId: o.orderId.toString(),
      role: o.customerWallet === wallet ? 'customer' : 'partner',
      customerWallet: o.customerWallet,
      partnerName: o.partner.companyName,
      itemDescription: o.itemDescription,
      amount: o.amount.toString(),
      amountKzt: Number(o.amountKzt),
      status: o.status,
      deadline: o.deadline.toISOString(),
      depositTxHash: o.depositTxHash,
      releaseTxHash: o.releaseTxHash,
      refundTxHash: o.refundTxHash,
      fundedAt: o.fundedAt?.toISOString() ?? null,
      releasedAt: o.releasedAt?.toISOString() ?? null,
      refundedAt: o.refundedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })));
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// SINGLE ORDER
// ============================================================================
router.get('/orders/:orderId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = BigInt(req.params.orderId!);
    const o = await prisma.preOrder.findUnique({
      where: { orderId },
      include: { partner: { select: { companyName: true } } },
    });
    if (!o) throw new AppError('Pre-order not found', 404, 'NOT_FOUND');

    return successResponse(res, {
      id: o.id,
      orderId: o.orderId.toString(),
      customerWallet: o.customerWallet,
      partnerName: o.partner.companyName,
      partnerWallet: o.partnerWallet,
      itemDescription: o.itemDescription,
      amount: o.amount.toString(),
      amountKzt: Number(o.amountKzt),
      status: o.status,
      deadline: o.deadline.toISOString(),
      depositTxHash: o.depositTxHash,
      releaseTxHash: o.releaseTxHash,
      refundTxHash: o.refundTxHash,
      fundedAt: o.fundedAt?.toISOString() ?? null,
      releasedAt: o.releasedAt?.toISOString() ?? null,
      refundedAt: o.refundedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// METRICS  (computed entirely from real DB data — nothing hardcoded)
// ============================================================================
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [funded, released, refunded, lockedAgg, releasedAgg] = await Promise.all([
      prisma.preOrder.count({ where: { status: 'FUNDED' } }),
      prisma.preOrder.count({ where: { status: 'RELEASED' } }),
      prisma.preOrder.count({ where: { status: 'REFUNDED' } }),
      prisma.preOrder.aggregate({ _sum: { amountKzt: true }, where: { status: 'FUNDED' } }),
      prisma.preOrder.aggregate({ _sum: { amountKzt: true }, where: { status: 'RELEASED' } }),
    ]);

    const kztLocked = Number(lockedAgg._sum.amountKzt ?? 0n);
    const kztReleased = Number(releasedAgg._sum.amountKzt ?? 0n);

    return successResponse(res, {
      // Pre-orders currently escrowed (committed but not yet fulfilled).
      preOrdersLocked: funded,
      kztPrepaidLocked: kztLocked,
      // Fulfilled orders — guaranteed revenue the confectionery already secured.
      ordersFulfilled: released,
      kztSettledToPartners: kztReleased,
      // Write-offs prevented: prepaid demand the confectionery baked for with
      // zero risk of unsold stock (every locked + fulfilled order is committed money).
      writeOffsPreventedKzt: kztLocked + kztReleased,
      ordersRefunded: refunded,
      totalOrders: funded + released + refunded,
    });
  } catch (error) {
    return next(error);
  }
});

// Admin-only manual refund bypass kept available but unused by the UI.
router.post('/admin/orders/:orderId/force-refund', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = BigInt(req.params.orderId!);
    const preOrder = await prisma.preOrder.findUnique({ where: { orderId } });
    if (!preOrder) throw new AppError('Pre-order not found', 404, 'NOT_FOUND');
    if (preOrder.status !== 'FUNDED') {
      throw new AppError(`Cannot refund an order in status ${preOrder.status}`, 400, 'BAD_STATUS');
    }
    const txRef = await refundOnChain(orderId);
    await prisma.preOrder.update({
      where: { orderId },
      data: { status: 'REFUNDED', refundedAt: new Date(), refundTxHash: txRef },
    });
    await creditSweet(preOrder.customerWallet, preOrder.amountKzt);
    logger.info(`[Escrow] admin force-refund order=${orderId}`);
    return successResponse(res, { status: 'REFUNDED', orderId: orderId.toString(), refundTxHash: txRef });
  } catch (error) {
    return next(error);
  }
});

export default router;
