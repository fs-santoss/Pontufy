import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { acquireLock, releaseLock } from '@/lib/redis/mutex';
import { checkVelocityLimit } from '@/lib/security/velocity';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { lessonId } = await request.json();

    if (!lessonId) return NextResponse.json({ error: 'lessonId é obrigatório' }, { status: 400 });

    const db = getTenantDb(tenantId);

    // Validates lesson exists AND belongs to this tenant (via course.tenantId relation scope).
    const lesson = await db.lesson.findFirst({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada no escopo da empresa.' }, { status: 404 });
    }

    // Distributed lock prevents double-credit if the client fires two concurrent completions.
    const lockKey = `lesson:${tenantId}:${userId}:${lessonId}`;
    const lockAcquired = await acquireLock(lockKey, 10);
    if (!lockAcquired) {
      return NextResponse.json({ error: 'Transação já em andamento. Aguarde.' }, { status: 429 });
    }

    try {
      // Idempotency: return current balance without double-crediting.
      // findFirst required — findUnique rejects the tenantId injected by the interceptor.
      const alreadyCompleted = await db.lessonCompletion.findFirst({
        where: { userId, lessonId },
      });
      if (alreadyCompleted) {
        const user = await db.user.findFirst({ where: { id: userId } });
        return NextResponse.json({
          success: true,
          message: 'Aula já concluída anteriormente.',
          newBalance: user?.pointsBalance ?? 0,
          alreadyCompleted: true,
        });
      }

      const velocity = await checkVelocityLimit(userId, tenantId);
      if (!velocity.allowed) {
        return NextResponse.json({ error: velocity.reason }, { status: 429 });
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
    } finally {
      await releaseLock(lockKey);
    }
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('Erro ao completar aula:', error);
    return NextResponse.json({ error: 'Falha interna no servidor ao concluir aula.' }, { status: 500 });
  }
}
