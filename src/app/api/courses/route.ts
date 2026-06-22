import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const courses = await db.course.findMany({
      where: { status: 'published' },
      include: { lessons: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json([], { status: 401 });
    }
    console.error('GET /api/courses:', error);
    return NextResponse.json([], { status: 500 });
  }
}
