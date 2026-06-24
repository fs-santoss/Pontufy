import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function GET() {
  try {
    const { userId, tenantId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, name: true, role: true },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
}
