import { prisma } from './prisma';
import { logger } from './logger';
import type { Prisma } from '@prisma/client';

/**
 * Log a key action to the audit log.
 * Failures are silently ignored so they never break the main operation.
 */
export async function logAction(params: {
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    logger.error('[AuditLog] Failed to write:', err);
  }
}
