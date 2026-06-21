import { NextResponse } from 'next/server';
import { getSessionContext, getTenantDb } from '@/backend/db';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext(request);
    const { lessonId } = await request.json();

    if (!lessonId) return NextResponse.json({ error: "lessonId é obrigatório" }, { status: 400 });

    const db = getTenantDb(tenantId);

    // 1. Busca os detalhes da aula para saber quantos pontos ela vale
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada no escopo da empresa." }, { status: 404 });
    }

    const pointsToAward = lesson.pointsAssigned;

    // 2. Transação Atômica: Atualizar saldo do usuário e gerar log no extrato (Ledger)
    const result = await db.$transaction(async (tx: any) => {
      // Atualiza o usuário
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: pointsToAward } }
      });

      // Gera o log financeiro
      const ledgerEntry = await tx.pointsLedger.create({
        data: {
          userId: userId,
          tenantId: tenantId,
          type: 'gain',
          pointsAmount: pointsToAward,
          description: `Conclusão da Aula: ${lesson.title}`
        }
      });

      return { updatedUser, ledgerEntry };
    });

    return NextResponse.json({ 
      success: true, 
      message: `Você ganhou +${pointsToAward} pontos!`,
      newBalance: result.updatedUser.pointsBalance
    });

  } catch (error: any) {
    console.error("Erro ao completar aula:", error);
    return NextResponse.json(
      { error: error.message || "Falha interna no servidor ao concluir aula." }, 
      { status: 500 }
    );
  }
}
