'use server';

import { getSessionContext } from '@/backend/session';
import { getTenantPrisma } from '@/backend/db';
import { acquireLock, releaseLock } from '@/lib/redis/mutex';

export async function redeemRewardAction(rewardId: string): Promise<{
  success: boolean;
  newBalance?: number;
  affiliateUrl?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { tenantId, userId } = await getSessionContext();

    if (!rewardId) return { success: false, error: "rewardId é obrigatório" };

    const lockKey = `redeem:${tenantId}:${userId}`;
    const lockAcquired = await acquireLock(lockKey, 10);
    
    if (!lockAcquired) {
      return { success: false, error: "Transação já em andamento. Aguarde." };
    }

    try {
      const db = getTenantPrisma(tenantId);

      const reward = await db.reward.findUnique({
        where: { id: rewardId }
      });

      if (!reward || !reward.isActive) {
        return { success: false, error: "Recompensa indisponível ou inativa." };
      }

      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) return { success: false, error: "Usuário não encontrado." };

      if (user.pointsBalance < reward.pricePoints) {
        return { 
          success: false,
          error: "Saldo insuficiente.", 
        };
      }

      const result = await db.$transaction(async (tx: any) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { decrement: reward.pricePoints } }
        });

        await tx.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'loss',
            pointsAmount: reward.pricePoints,
            description: `Resgate: ${reward.title}`,
          },
        });

        return updatedUser;
      });

      const trackingId = `${tenantId}:${userId}:${Date.now()}`;
      const urlWithTracking = `${reward.affiliateLink}?trackingId=${trackingId}`;

      return { 
        success: true, 
        message: "Resgate concluído com sucesso!",
        newBalance: result.pointsBalance,
        affiliateUrl: urlWithTracking
      };
    } finally {
      await releaseLock(lockKey);
    }

  } catch (error: any) {
    console.error("Erro no resgate de recompensa:", error);
    return { success: false, error: "Falha interna no servidor." };
  }
}
