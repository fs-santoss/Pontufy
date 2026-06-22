import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb, prisma } from '@/backend/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { id } = await params;
    const db = getTenantDb(tenantId);

    const course = await db.course.findFirst({
      where: { id, status: 'published' },
      include: {
        lessons: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 });
    }

    const completions = await prisma.lessonCompletion.findMany({
      where: {
        userId,
        lessonId: { in: course.lessons.map((l) => l.id) },
      },
      select: { lessonId: true },
    });

    const completedIds = new Set(completions.map((c) => c.lessonId));

    const lessons = course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      contentUrl: lesson.contentUrl,
      points: lesson.pointsAssigned,
      completed: completedIds.has(lesson.id),
    }));

    return NextResponse.json({
      id: course.id,
      title: course.title,
      description: course.description,
      lessons,
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('GET /api/courses/[id]:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
