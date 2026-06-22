'use server';

import { getSessionContext } from '@/backend/session';
import { prisma, getTenantPrisma } from '@/backend/db';

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

    const db = getTenantPrisma(tenantId);

    const lesson = await db.lesson.findFirst({ 
      where: { 
        id: lessonId,
        course: { tenantId } 
      } 
    });
    if (!lesson) {
      return { success: false, error: 'Aula não encontrada no escopo da empresa.' };
    }

    // Idempotency: return current balance if already completed
    const alreadyCompleted = await prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    
    if (alreadyCompleted) {
      const user = await db.user.findUnique({ where: { id: userId } });
      return {
        success: true,
        message: 'Aula já concluída anteriormente.',
        newBalance: user?.pointsBalance ?? 0,
        alreadyCompleted: true,
      };
    }

    const pointsToAward = lesson.pointsAssigned;

    const result = await db.$transaction(async (tx: any) => {
      // 1) Upsert UserLessonProgress to completed
      // Using create since our schema has no update status on completion yet,
      // it just creates a record when completed.
      await tx.lessonCompletion.create({ data: { userId, lessonId } });

      // 3) Increment User.currentPoints
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: pointsToAward } },
      });

      // 2) Insert positive log in PointsLedger
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
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return { success: false, error: 'Não autenticado.' };
    }
    console.error('Erro ao completar aula:', error);
    return { success: false, error: 'Falha interna no servidor ao concluir aula.' };
  }
}
