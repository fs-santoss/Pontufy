import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function GET() {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getTenantDb(tenantId);

    const users = await db.user.findMany({
      where: { role: { not: 'admin_rh' } },
      select: { id: true },
    });
    const userIds = users.map((u: any) => u.id);

    const completions = await db.lessonCompletion.findMany({
      where: { userId: { in: userIds } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const gains = await db.pointsLedger.findMany({
      where: { tenantId, type: 'gain' },
      select: { pointsAmount: true, timestamp: true },
    });

    const losses = await db.pointsLedger.findMany({
      where: { tenantId, type: 'loss' },
      select: { pointsAmount: true },
    });

    // Aggregate completions and points by day
    const dailyMap = new Map<string, { completions: number; points: number }>();

    for (const c of completions) {
      const day = c.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(day) || { completions: 0, points: 0 };
      entry.completions++;
      dailyMap.set(day, entry);
    }

    for (const g of gains) {
      const day = g.timestamp.toISOString().split('T')[0];
      const entry = dailyMap.get(day) || { completions: 0, points: 0 };
      entry.points += g.pointsAmount;
      dailyMap.set(day, entry);
    }

    const engagement = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        completions: data.completions,
        points: data.points,
      }));

    const totalPointsAwarded = gains.reduce((s, g) => s + g.pointsAmount, 0);
    const totalPointsRedeemed = losses.reduce((s, l) => s + l.pointsAmount, 0);

    return NextResponse.json({
      summary: {
        totalUsers: userIds.length,
        totalCompletions: completions.length,
        totalPointsAwarded,
        totalPointsRedeemed,
      },
      engagement,
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('GET /api/admin/analytics:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
