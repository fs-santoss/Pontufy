import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

export async function GET() {
  try {
    const { userId } = await getSessionContext();

    const history = await prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
}
