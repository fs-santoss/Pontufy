import { NextResponse } from 'next/server';
import { prisma } from '@/backend/db';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Extraindo dados do webhook da rede de afiliados (ex: Lomadee)
    const { 
      transactionId, 
      status, 
      commission, 
      trackingId // Este foi injetado pelo nosso backend no momento do resgate
    } = payload;

    if (!transactionId || !trackingId) {
      return NextResponse.json({ error: 'Payload inválido. transactionId e trackingId são obrigatórios.' }, { status: 400 });
    }

    // O trackingId que criamos segue o padrão: tenantId:userId:timestamp
    const [tenantId, userId] = trackingId.split(':');

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'trackingId malformado.' }, { status: 400 });
    }

    // 1. Verificação de Idempotência e Tratamento de Status
    const isApproved = status === 'Approved';
    const isCancelled = status === 'Cancelled';

    if (!isApproved && !isCancelled) {
       // Ignora outros status como 'Pending' silenciosamente
       return NextResponse.json({ success: true, message: 'Status ignorado.' }, { status: 200 });
    }

    const pointsToProcess = Math.floor(commission * 10);

    // Verifica se já processamos a aprovação
    const existingApprovalLog = await prisma.pointsLedger.findFirst({
      where: { description: { contains: `[TX:${transactionId}]` }, type: 'gain' }
    });

    if (isApproved) {
      if (existingApprovalLog) {
        return NextResponse.json({ success: true, message: 'Transação de ganho já processada (Idempotente).' }, { status: 200 });
      }

      // Processar Aprovação
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: pointsToProcess } }
        });

        await tx.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'gain',
            pointsAmount: pointsToProcess,
            description: `Cashback Afiliado [TX:${transactionId}]`,
          },
        });
      });
      return NextResponse.json({ success: true, message: 'Cashback creditado com sucesso.' }, { status: 200 });
    }

    if (isCancelled) {
      // Se foi cancelado, verifica se estorno já foi feito
      const existingChargebackLog = await prisma.pointsLedger.findFirst({
        where: { description: { contains: `[CHARGEBACK:TX:${transactionId}]` }, type: 'loss' }
      });

      if (existingChargebackLog) {
        return NextResponse.json({ success: true, message: 'Chargeback já processado (Idempotente).' }, { status: 200 });
      }

      // Só pode estornar se houve aprovação prévia creditada
      if (!existingApprovalLog) {
        return NextResponse.json({ success: true, message: 'Cancelado antes da aprovação. Nenhum saldo alterado.' }, { status: 200 });
      }

      // Processar Chargeback (Estorno Seguro)
      await prisma.$transaction(async (tx: any) => {
        // Obter usuário atual para evitar saldo negativo bruto, embora saldo negativo seja conceitualmente válido para fraudes.
        await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { decrement: pointsToProcess } }
        });

        await tx.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'loss',
            pointsAmount: pointsToProcess,
            description: `Estorno Cashback Cancelado [CHARGEBACK:TX:${transactionId}]`,
          },
        });
      });
      return NextResponse.json({ success: true, message: 'Estorno processado com sucesso (Chargeback).' }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro no Webhook da Lomadee:', error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
