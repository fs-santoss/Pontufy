import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/backend/db';

const WEBHOOK_SECRET = process.env.AFFILIATE_WEBHOOK_SECRET || '';

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !signature) return false;
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
}

interface AffiliatePayload {
  network: string;
  trackingId: string;
  orderId: string;
  orderValue: number;
  commissionValue: number;
  status: 'approved' | 'pending' | 'rejected';
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-affiliate-signature');

    if (WEBHOOK_SECRET) {
      const valid = await verifyHmac(rawBody, signature || '', WEBHOOK_SECRET);
      if (!valid) {
        return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401 });
      }
    }

    const payload: AffiliatePayload = JSON.parse(rawBody);

    if (!payload.trackingId || !payload.orderId || !payload.status) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    // trackingId format: {tenantId}:{userId}:{timestamp}
    const parts = payload.trackingId.split(':');
    if (parts.length < 3) {
      return NextResponse.json({ error: 'MALFORMED_TRACKING_ID' }, { status: 400 });
    }

    const [tenantId, userId] = parts;

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    // Idempotency: check if orderId already processed
    const existing = await prisma.pointsLedger.findFirst({
      where: {
        userId,
        tenantId,
        description: { contains: payload.orderId },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'ALREADY_PROCESSED' });
    }

    if (payload.status === 'approved' && payload.commissionValue > 0) {
      const bonusPoints = Math.round(payload.commissionValue * 10);

      await prisma.$transaction([
        prisma.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'gain',
            pointsAmount: bonusPoints,
            description: `Comissão ${payload.network} - Pedido ${payload.orderId}`,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: bonusPoints } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'COMMISSION_SETTLED',
        pointsAwarded: bonusPoints,
      });
    }

    return NextResponse.json({
      success: true,
      message: `STATUS_${payload.status.toUpperCase()}`,
    });
  } catch (error) {
    console.error('POST /api/webhooks/affiliates:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
