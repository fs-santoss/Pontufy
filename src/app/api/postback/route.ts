import { NextRequest, NextResponse } from 'next/server';
import { processAffiliateCommission, verifyAffiliateSignature } from '@/backend/affiliateService';
import { getAffiliateCredential } from '@/backend/tenant';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const signature = request.headers.get('x-pontufy-signature');

    // For postback, we might need per-tenant secrets from TENANT_STORE
    const parts = payload.trackingId?.split(':');
    if (parts && parts.length > 0) {
      const tenantId = parts[0];
      try {
        const cred = getAffiliateCredential(tenantId, payload.network);
        if (cred?.apiSecret) {
          const isValid = await verifyAffiliateSignature(rawBody, signature || '', cred.apiSecret);
          if (!isValid) {
            return NextResponse.json({ success: false, message: 'INVALID_SIGNATURE' }, { status: 401 });
          }
        }
      } catch (e) {
        // Tenant not found or other credential error
        console.warn('Postback credential resolution failed', e);
      }
    }

    const result = await processAffiliateCommission({
      network: payload.network,
      trackingId: payload.trackingId,
      orderId: payload.orderId,
      orderValue: payload.orderValue,
      commissionValue: payload.commissionValue,
      status: payload.status,
    });

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (e) {
    console.error('Postback route error', e);
    return NextResponse.json(
      { success: false, message: 'BAD_REQUEST' },
      { status: 400 },
    );
  }
}
