import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

export async function GET() {
  try {
    const { userId } = await getSessionContext();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, name: true, role: true },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
}
