import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where: { status: 'published' },
        include: { lessons: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.course.count({ where: { status: 'published' } }),
    ]);

    return NextResponse.json({ data: courses, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json([], { status: 401 });
    }
    console.error('GET /api/courses:', error);
    return NextResponse.json([], { status: 500 });
  }
}
