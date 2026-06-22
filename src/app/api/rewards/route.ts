import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { cacheGet, cacheSet } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const category = searchParams.get('category');
    const skip = (page - 1) * limit;

    const cacheKey = `rewards:${tenantId}:p${page}:l${limit}:c${category || 'all'}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = { isActive: true };
    if (category) where.category = category;

    const [rewards, total] = await Promise.all([
      db.reward.findMany({
        where,
        orderBy: { pricePoints: 'asc' },
        skip,
        take: limit,
      }),
      db.reward.count({ where }),
    ]);

    const result = { data: rewards, total, page, limit, totalPages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json([], { status: 401 });
    }
    console.error('GET /api/rewards:', error);
    return NextResponse.json([], { status: 500 });
  }
}
