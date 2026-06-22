import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma, getTenantDb } from '@/backend/db';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { lessonId } = await request.json();

    if (!lessonId) return NextResponse.json({ error: 'lessonId é obrigatório' }, { status: 400 });

    const db = getTenantDb(tenantId);

    // findFirst (not findUnique) so the tenant extension can scope through the
    // parent Course relation — prevents completing lessons from other tenants.
    const lesson = await db.lesson.findFirst({ where: { id: lessonId } });
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
