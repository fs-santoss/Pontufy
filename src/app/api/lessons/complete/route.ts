import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma, getTenantDb } from '@/backend/db';

const MAX_POINTS_PER_LESSON = 200;

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { lessonId, coursePayload } = await request.json();

    if (!lessonId) return NextResponse.json({ error: 'lessonId é obrigatório' }, { status: 400 });

    const db = getTenantDb(tenantId);

    let lesson = await db.lesson.findFirst({ where: { id: lessonId } });

    if (!lesson && coursePayload) {
      const points = Math.min(
        Math.max(0, Math.round(Number(coursePayload.lessons?.find((l: any) => l.id === lessonId)?.points) || 0)),
        MAX_POINTS_PER_LESSON,
      );
      await prisma.$transaction(async (tx: any) => {
        await tx.course.upsert({
          where: { id: coursePayload.courseId },
          update: {},
          create: {
            id: coursePayload.courseId,
            tenantId,
            title: String(coursePayload.courseTitle || 'Curso').slice(0, 255),
            description: coursePayload.courseDescription ? String(coursePayload.courseDescription).slice(0, 2000) : null,
            status: 'published',
          },
        });
        for (const l of coursePayload.lessons || []) {
          await tx.lesson.upsert({
            where: { id: l.id },
            update: {},
            create: {
              id: l.id,
              courseId: coursePayload.courseId,
              title: String(l.title || 'Aula').slice(0, 255),
              type: l.type || 'video',
              contentUrl: l.contentUrl || null,
              pointsAssigned: Math.min(Math.max(0, Math.round(Number(l.points) || 0)), MAX_POINTS_PER_LESSON),
            },
          });
        }
      });
      lesson = await db.lesson.findFirst({ where: { id: lessonId } });
    }

    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada no escopo da empresa.' }, { status: 404 });
    }

    // Idempotency: return current balance if already completed (no double-credit)
    const alreadyCompleted = await prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (alreadyCompleted) {
      const user = await db.user.findUnique({ where: { id: userId } });
      return NextResponse.json({
        success: true,
        message: 'Aula já concluída anteriormente.',
        newBalance: user?.pointsBalance ?? 0,
        alreadyCompleted: true,
      });
    }

    const pointsToAward = lesson.pointsAssigned;

    const result = await db.$transaction(async (tx: any) => {
      await tx.lessonCompletion.create({ data: { userId, lessonId } });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: pointsToAward } },
      });

      await tx.pointsLedger.create({
        data: {
          userId,
          tenantId,
          type: 'gain',
          pointsAmount: pointsToAward,
          description: `Conclusão da Aula: ${lesson.title}`,
        },
      });

      return { updatedUser };
    });

    return NextResponse.json({
      success: true,
      message: `Você ganhou +${pointsToAward} pontos!`,
      newBalance: result.updatedUser.pointsBalance,
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('Erro ao completar aula:', error);
    return NextResponse.json({ error: 'Falha interna no servidor ao concluir aula.' }, { status: 500 });
  }
}
