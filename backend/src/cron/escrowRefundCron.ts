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

export async function runEscrowRefundSweep(): Promise<void> {
  if (!config.ton.contracts.sweetPassEscrow) {
    return; // escrow not deployed/configured — nothing to do
  }

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

  logger.info(`[EscrowRefund] Scheduled auto-refund sweep every ${POLL_INTERVAL_MS / 1000}s`);
}
