import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

export async function GET() {
  try {
    const { userId } = await getSessionContext();

    const ledger = await prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    const history = ledger.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: entry.pointsAmount,
      description: entry.description,
      date: entry.timestamp.toLocaleDateString('pt-BR'),
    }));

    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
}
