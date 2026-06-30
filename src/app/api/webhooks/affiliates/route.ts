import { NextRequest, NextResponse } from 'next/server';
import { verifyAffiliateSignature, processAffiliateCommission } from '@/backend/affiliateService';

const WEBHOOK_SECRET = process.env.AFFILIATE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-affiliate-signature');

    if (WEBHOOK_SECRET) {
      const valid = await verifyAffiliateSignature(rawBody, signature || '', WEBHOOK_SECRET);
      if (!valid) {
        return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const result = await processAffiliateCommission({
      network: payload.network,
      trackingId: payload.trackingId,
      orderId: payload.orderId,
      orderValue: payload.orderValue,
      commissionValue: payload.commissionValue,
      status: payload.status,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/webhooks/affiliates:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
