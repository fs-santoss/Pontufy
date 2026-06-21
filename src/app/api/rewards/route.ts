import { NextResponse } from 'next/server';
import { getSessionContext, getTenantDb } from '@/backend/db';

export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionContext(request);
    const db = getTenantDb(tenantId);

    const rewards = await db.reward.findMany({
      where: { isActive: true },
      orderBy: { pricePoints: 'asc' },
    });

    return NextResponse.json(rewards);
  } catch (error: any) {
    console.error('GET /api/rewards:', error);
    return NextResponse.json([], { status: 500 });
  }
}
