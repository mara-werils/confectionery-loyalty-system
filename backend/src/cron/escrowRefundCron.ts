/**
 * Sweet Pass Auto-Refund Cron
 *
 * The escrow contract makes refunds permissionless after the pickup deadline.
 * This keeper periodically scans for FUNDED pre-orders whose deadline has passed
 * and pokes the contract's op::escrow_refund — no manual admin intervention is
 * needed; the contract itself enforces the deadline and FUNDED-only guard.
 *
 * Demo cadence: every 60s (so the committee can watch an expired order refund
 * itself within a minute), plus one run shortly after startup.
 */

import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
import { config } from '../config';
import { refundOnChain, getOnChainOrder, OnChainStatus } from '../services/escrow.service';

const POLL_INTERVAL_MS = 60 * 1000;
// Deposit confirmation runs more often so a funded order surfaces within seconds,
// even if the customer closed the app right after signing the transfer.
const DEPOSIT_SWEEP_INTERVAL_MS = 12 * 1000;
// Only chase recently-created deposits; an order the customer never funded should
// not be polled forever.
const DEPOSIT_SWEEP_WINDOW_MS = 60 * 60 * 1000;

// Re-entrancy guards: each sweep now waits for on-chain confirmation, so a run can
// outlast its interval. Skip a tick rather than overlap with one already in flight.
let refundSweeping = false;
let depositSweeping = false;

export async function runEscrowRefundSweep(): Promise<void> {
  if (!config.ton.contracts.sweetPassEscrow) {
    return; // escrow not deployed/configured — nothing to do
  }
  if (refundSweeping) return;
  refundSweeping = true;

  try {
    const expired = await prisma.preOrder.findMany({
      where: { status: 'FUNDED', deadline: { lt: new Date() } },
      take: 25,
    });

    if (expired.length === 0) return;
    logger.info(`[EscrowRefund] ${expired.length} expired FUNDED order(s) to refund`);

    for (const order of expired) {
      try {
        // Guard against a release that landed between query and now.
        const onchain = await getOnChainOrder(order.orderId);
        if (onchain.status !== OnChainStatus.Funded) {
          // Reconcile DB with on-chain reality and skip.
          if (onchain.status === OnChainStatus.Released) {
            await prisma.preOrder.update({
              where: { orderId: order.orderId },
              data: { status: 'RELEASED', releasedAt: order.releasedAt ?? new Date() },
            });
          } else if (onchain.status === OnChainStatus.Refunded) {
            await prisma.preOrder.update({
              where: { orderId: order.orderId },
              data: { status: 'REFUNDED', refundedAt: order.refundedAt ?? new Date() },
            });
          }
          continue;
        }

        const txRef = await refundOnChain(order.orderId);
        await prisma.preOrder.update({
          where: { orderId: order.orderId },
          data: { status: 'REFUNDED', refundedAt: new Date(), refundTxHash: txRef },
        });

        io.to(`wallet:${order.customerWallet}`).emit('sweetpass:refunded', {
          orderId: order.orderId.toString(),
          amountKzt: Number(order.amountKzt),
          item: order.itemDescription,
        });
        io.to(`partner:${order.partnerId}`).emit('sweetpass:refunded', {
          orderId: order.orderId.toString(),
          item: order.itemDescription,
        });
        io.emit('activity:new', {
          type: 'sweetpass_refunded',
          message: `Sweet Pass auto-refunded (deadline passed): ${order.itemDescription} (${order.amountKzt} KZT returned)`,
          amount: Number(order.amountKzt),
          timestamp: new Date().toISOString(),
        });

        logger.info(`[EscrowRefund] refunded order=${order.orderId} (${order.amountKzt} KZT)`);
      } catch (err) {
        logger.error(`[EscrowRefund] failed to refund order=${order.orderId}:`, err);
      }
    }
  } catch (err) {
    logger.error('[EscrowRefund] sweep error:', err);
  } finally {
    refundSweeping = false;
  }
}

/**
 * Sweet Pass Deposit-Confirmation Sweep
 *
 * Funding a pre-order is normally confirmed by the customer's own client polling
 * /confirm-deposit. This keeper makes funding robust regardless of the client:
 * it scans recent PENDING_DEPOSIT orders, reads the escrow's get_order, and flips
 * any that the chain already reports as FUNDED — emitting the same real-time
 * events the route does. If the customer closes the app right after signing, the
 * confectionery still sees the order within seconds.
 */
export async function runDepositConfirmSweep(): Promise<void> {
  if (!config.ton.contracts.sweetPassEscrow) return;
  if (depositSweeping) return;
  depositSweeping = true;

  try {
    const since = new Date(Date.now() - DEPOSIT_SWEEP_WINDOW_MS);
    const pending = await prisma.preOrder.findMany({
      where: { status: 'PENDING_DEPOSIT', createdAt: { gt: since } },
      take: 25,
    });
    if (pending.length === 0) return;

    for (const order of pending) {
      try {
        const onchain = await getOnChainOrder(order.orderId);
        if (onchain.status !== OnChainStatus.Funded) continue;

        // Flip only if still PENDING_DEPOSIT (the client poll may have won the race).
        const result = await prisma.preOrder.updateMany({
          where: { orderId: order.orderId, status: 'PENDING_DEPOSIT' },
          data: { status: 'FUNDED', fundedAt: new Date() },
        });
        if (result.count !== 1) continue; // already confirmed elsewhere — don't double-emit

        io.to(`wallet:${order.customerWallet}`).emit('sweetpass:funded', {
          orderId: order.orderId.toString(),
          amountKzt: Number(order.amountKzt),
          item: order.itemDescription,
        });
        io.to(`partner:${order.partnerId}`).emit('sweetpass:funded', {
          orderId: order.orderId.toString(),
          amountKzt: Number(order.amountKzt),
          item: order.itemDescription,
        });
        io.emit('activity:new', {
          type: 'sweetpass_funded',
          message: `New Sweet Pass pre-order locked: ${order.itemDescription} (${order.amountKzt} KZT)`,
          amount: Number(order.amountKzt),
          timestamp: new Date().toISOString(),
        });

        logger.info(`[DepositSweep] confirmed FUNDED order=${order.orderId} (${order.amountKzt} KZT)`);
      } catch (err) {
        logger.error(`[DepositSweep] failed to confirm order=${order.orderId}:`, err);
      }
    }
  } catch (err) {
    logger.error('[DepositSweep] sweep error:', err);
  } finally {
    depositSweeping = false;
  }
}

export function startEscrowRefundCron(): void {
  // Initial run a few seconds after startup (after DB connects).
  setTimeout(() => {
    runEscrowRefundSweep().catch((err) => logger.error('[EscrowRefund] startup run failed:', err));
  }, 8000);

  setInterval(() => {
    runEscrowRefundSweep().catch((err) => logger.error('[EscrowRefund] scheduled run failed:', err));
  }, POLL_INTERVAL_MS);

  // Fast deposit-confirmation sweep so funded orders surface within seconds.
  setTimeout(() => {
    runDepositConfirmSweep().catch((err) => logger.error('[DepositSweep] startup run failed:', err));
  }, 5000);

  setInterval(() => {
    runDepositConfirmSweep().catch((err) => logger.error('[DepositSweep] scheduled run failed:', err));
  }, DEPOSIT_SWEEP_INTERVAL_MS);

  logger.info(
    `[EscrowRefund] auto-refund every ${POLL_INTERVAL_MS / 1000}s; deposit-confirm every ${DEPOSIT_SWEEP_INTERVAL_MS / 1000}s`
  );
}
