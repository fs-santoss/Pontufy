import { timingSafeEqual, createHmac } from 'crypto';
import { prisma } from '@/backend/db';
import { createLogger } from './logger';

export interface AffiliateEvent {
  network: string;
  trackingId: string;
  orderId: string;
  orderValue: number;
  commissionValue: number;
  status: 'approved' | 'pending' | 'rejected' | 'Cancelled' | 'Approved';
  currency?: string;
}

export interface AffiliateServiceResponse {
  success: boolean;
  message: string;
  pointsAwarded?: number;
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function verifyAffiliateSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return constantTimeEqual(expected, signature);
  } catch {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return constantTimeEqual(expected, signature);
  }
}

export async function processAffiliateCommission(
  event: AffiliateEvent
): Promise<AffiliateServiceResponse> {
  const log = createLogger('system', 'affiliate-service');

  if (!event.trackingId || !event.orderId) {
    return { success: false, message: 'MISSING_FIELDS' };
  }

  // trackingId format: {tenantId}:{userId}:{timestamp}
  const parts = event.trackingId.split(':');
  if (parts.length < 2) {
    return { success: false, message: 'MALFORMED_TRACKING_ID' };
  }

  const tenantId = parts[0];
  const userId = parts[1];

  const isApproved = ['approved', 'Approved'].includes(event.status);
  const isCancelled = ['rejected', 'Cancelled'].includes(event.status);

  if (!isApproved && !isCancelled) {
    return { success: true, message: 'STATUS_IGNORED' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      log.error('User not found or tenant mismatch', { userId, tenantId });
      return { success: false, message: 'USER_NOT_FOUND' };
    }

    if (isApproved) {
      // Check if we already have a 'gain' for this order
      const existingGain = await prisma.pointsLedger.findFirst({
        where: {
          userId,
          tenantId,
          type: 'gain',
          description: { contains: event.orderId },
        },
      });

      if (existingGain) {
        return { success: true, message: 'ALREADY_PROCESSED' };
      }

      const pointsToAward = Math.round(event.commissionValue * 10);
      if (pointsToAward <= 0) {
        return { success: true, message: 'ZERO_POINTS' };
      }

      await prisma.$transaction([
        prisma.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'gain',
            pointsAmount: pointsToAward,
            description: `Comissão ${event.network} [Order:${event.orderId}]`,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: pointsToAward } },
        }),
      ]);

      return { success: true, message: 'COMMISSION_SETTLED', pointsAwarded: pointsToAward };
    }

    if (isCancelled) {
      // Check if we already have a 'loss' for this order (already cancelled)
      const existingLoss = await prisma.pointsLedger.findFirst({
        where: {
          userId,
          tenantId,
          type: 'loss',
          description: { contains: event.orderId },
        },
      });

      if (existingLoss) {
        return { success: true, message: 'CHARGEBACK_ALREADY_PROCESSED' };
      }

      // Check if there was a 'gain' to reverse
      const existingGain = await prisma.pointsLedger.findFirst({
        where: {
          userId,
          tenantId,
          type: 'gain',
          description: { contains: event.orderId },
        },
      });

      if (!existingGain) {
        return { success: true, message: 'CANCELLED_BEFORE_APPROVAL' };
      }

      const pointsToDeduct = existingGain.pointsAmount;

      await prisma.$transaction([
        prisma.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'loss',
            pointsAmount: pointsToDeduct,
            description: `Estorno ${event.network} [Order:${event.orderId}]`,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { pointsBalance: { decrement: pointsToDeduct } },
        }),
      ]);

      return { success: true, message: 'CHARGEBACK_PROCESSED' };
    }

    return { success: true, message: 'OK' };
  } catch (error: any) {
    log.error('Error processing commission', { error: error.message, orderId: event.orderId });
    return { success: false, message: 'INTERNAL_ERROR' };
  }
}
