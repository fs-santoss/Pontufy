import { prisma } from '@/backend/db';

interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousValues?: any;
  newValues?: any;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId || null,
        action: entry.action,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        previousValues: entry.previousValues ? JSON.stringify(entry.previousValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
      },
    });
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

export function extractRequestMeta(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  };
}
