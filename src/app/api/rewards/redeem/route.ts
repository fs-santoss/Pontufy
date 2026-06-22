import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { rewardId } = await request.json();

    if (!rewardId) return NextResponse.json({ error: "rewardId é obrigatório" }, { status: 400 });

    const db = getTenantDb(tenantId);

    // 1. Busca os detalhes da recompensa
    // A extensão Prisma garante que se for um prêmio específico de outro tenant, ele não será encontrado
    const reward = await db.reward.findUnique({
      where: { id: rewardId }
    });

    if (!reward || !reward.isActive) {
      return NextResponse.json({ error: "Recompensa indisponível ou inativa." }, { status: 404 });
    }

    // 2. Busca o saldo do usuário atual
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    // 3. Validação de Regra de Negócio (Saldo suficiente?)
    if (user.pointsBalance < reward.pricePoints) {
      return NextResponse.json({ 
        error: "Saldo insuficiente.", 
        missing: reward.pricePoints - user.pointsBalance 
      }, { status: 400 });
    }

    // 4. Transação Atômica: Deduz saldo, gera log negativo e retorna o link
    const result = await db.$transaction(async (tx: any) => {
      // Debita os pontos
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: reward.pricePoints } }
      });

      // Registra a saída no extrato
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

    // Em um fluxo real B2B2C, aqui o backend injetaria o tracking ID único no affiliateLink
    const trackingId = `${tenantId}:${userId}:${Date.now()}`;
    const urlWithTracking = `${reward.affiliateLink}?trackingId=${trackingId}`;

    return NextResponse.json({ 
      success: true, 
      message: "Resgate concluído com sucesso!",
      newBalance: result.pointsBalance,
      affiliateUrl: urlWithTracking
    });

  } catch (error: any) {
    console.error("Erro no resgate de recompensa:", error);
    return NextResponse.json({ error: "Falha interna no servidor." }, { status: 500 });
  }
}
