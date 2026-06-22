import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb, prisma } from '@/backend/db';

export async function GET() {
  try {
    const { tenantId, userId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const courses = await db.course.findMany({
      where: { status: 'published' },
      include: { lessons: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const lessonIds = courses.flatMap((c: any) => c.lessons.map((l: any) => l.id));

    const completions = await prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true },
    });

    const completedIds = new Set(completions.map((c) => c.lessonId));

    const enriched = courses.map((course: any) => {
      const totalLessons = course.lessons.length;
      const completedLessons = course.lessons.filter((l: any) => completedIds.has(l.id)).length;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let status: 'available' | 'in_progress' | 'completed' = 'available';
      if (completedLessons > 0 && completedLessons < totalLessons) status = 'in_progress';
      else if (completedLessons === totalLessons && totalLessons > 0) status = 'completed';

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        totalLessons,
        completedLessons,
        progress,
        status,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('GET /api/courses/enrolled:', error);
    return NextResponse.json([], { status: 500 });
  }
}
