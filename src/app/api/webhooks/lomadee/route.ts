import { NextResponse } from 'next/server';
import { processAffiliateCommission } from '@/backend/affiliateService';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    const { 
      transactionId, 
      status, 
      commission, 
      trackingId
    } = payload;

    const result = await processAffiliateCommission({
      network: 'Lomadee',
      trackingId,
      orderId: transactionId,
      orderValue: 0, // Lomadee might not provide total order value in this simplified payload
      commissionValue: commission,
      status,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (error: any) {
    console.error('Erro no Webhook da Lomadee:', error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
