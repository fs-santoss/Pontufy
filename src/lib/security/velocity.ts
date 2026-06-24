import { getTenantDb } from '@/backend/db';

/**
 * Velocity Anti-Fraud Middleware
 * Throttles unnatural lesson completion speeds to prevent automated farming.
 */
export async function checkVelocityLimit(
  userId: string,
  tenantId: string,
  minSecondsThreshold: number = 20
): Promise<{ allowed: boolean; reason?: string }> {
  const db = getTenantDb(tenantId);

  // Fetch the most recent point gain for this user
  const lastGain = await db.pointsLedger.findFirst({
    where: {
      userId,
      tenantId,
      type: 'gain'
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  if (!lastGain) {
    return { allowed: true }; // First completion, always allowed
  }

  const now = new Date();
  const timeDiffSeconds = (now.getTime() - lastGain.timestamp.getTime()) / 1000;

  if (timeDiffSeconds < minSecondsThreshold) {
    console.warn(`[ANTI-FRAUD] User ${userId} attempted to farm points too quickly. Allowed margin: ${minSecondsThreshold}s, Actual: ${timeDiffSeconds}s`);
    return { 
      allowed: false, 
      reason: `Velocidade bloqueada. Aguarde ${Math.ceil(minSecondsThreshold - timeDiffSeconds)} segundos antes de concluir outra aula.` 
    };
  }

  return { allowed: true };
}
