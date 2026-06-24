'use server';

import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
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

    if (!rewardId) return { success: false, error: "rewardId Ã© obrigatÃ³rio" };

    const lockKey = `redeem:${tenantId}:${userId}`;
    const lockAcquired = await acquireLock(lockKey, 10);
    
    if (!lockAcquired) {
      return { success: false, error: "TransaÃ§Ã£o jÃ¡ em andamento. Aguarde." };
    }

    try {
      const db = getTenantDb(tenantId);

      const reward = await db.reward.findUnique({
        where: { id: rewardId }
      });

      if (!reward || !reward.isActive) {
        return { success: false, error: "Recompensa indisponÃ­vel ou inativa." };
      }

      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) return { success: false, error: "UsuÃ¡rio nÃ£o encontrado." };

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
        message: "Resgate concluÃ­do com sucesso!",
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
