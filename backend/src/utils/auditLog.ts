import { prisma } from './prisma';

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
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
}
