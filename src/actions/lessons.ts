'use server';

import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { acquireLock, releaseLock } from '@/lib/redis/mutex';

export async function completeLessonAndAwardPoints(lessonId: string): Promise<{
  success: boolean;
  newBalance?: number;
  alreadyCompleted?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { tenantId, userId } = await getSessionContext();

    if (!lessonId) return { success: false, error: 'lessonId é obrigatório' };

    const db = getTenantDb(tenantId);

    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, course: { tenantId } },
    });
    if (!lesson) {
      return { success: false, error: 'Aula não encontrada no escopo da empresa.' };
    }

    // Distributed lock prevents double-credit if the user triggers two concurrent completions.
    const lockKey = `lesson:${tenantId}:${userId}:${lessonId}`;
    const lockAcquired = await acquireLock(lockKey, 10);
    if (!lockAcquired) {
      return { success: false, error: 'Transação já em andamento. Aguarde.' };
    }

    try {
      // Idempotency: use findFirst — findUnique rejects the tenantId injected by the interceptor.
      const alreadyCompleted = await db.lessonCompletion.findFirst({
        where: { userId, lessonId },
      });

      if (alreadyCompleted) {
        const user = await db.user.findFirst({ where: { id: userId } });
        return {
          success: true,
          message: 'Aula já concluída anteriormente.',
          newBalance: user?.pointsBalance ?? 0,
          alreadyCompleted: true,
        };
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

      return {
        success: true,
        message: `Você ganhou +${pointsToAward} pontos!`,
        newBalance: result.updatedUser.pointsBalance,
      };
    } finally {
      await releaseLock(lockKey);
    }
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return { success: false, error: 'Não autenticado.' };
    }
    console.error('Erro ao completar aula:', error);
    return { success: false, error: 'Falha interna no servidor ao concluir aula.' };
  }
}
