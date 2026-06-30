import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSessionContext } from '@/backend/session';
import { prisma, getTenantDb } from '@/backend/db';

type DailyRow = { day: Date; completions: bigint; points: bigint };

export async function GET() {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getTenantDb(tenantId);

    // All scalar metrics aggregated in PostgreSQL — no in-memory accumulation.
    const [totalUsers, totalCompletions, pointsAwarded, pointsRedeemed] = await Promise.all([
      db.user.count({ where: { role: { not: 'admin_rh' } } }),
      db.lessonCompletion.count({ where: { user: { role: { not: 'admin_rh' } } } }),
      db.pointsLedger.aggregate({ _sum: { pointsAmount: true }, where: { type: 'gain' } }),
      db.pointsLedger.aggregate({ _sum: { pointsAmount: true }, where: { type: 'loss' } }),
    ]);

    // Daily engagement for the last 30 days: COUNT and SUM computed entirely in PostgreSQL.
    // $queryRaw is required because Prisma groupBy does not support DATE_TRUNC.
    // tenantId is injected explicitly here since $queryRaw bypasses the Zero-Trust extension.
    const rows = await prisma.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT
        COALESCE(c.day, p.day)       AS day,
        COALESCE(c.completions, 0)   AS completions,
        COALESCE(p.points, 0)        AS points
      FROM (
        SELECT DATE_TRUNC('day', "createdAt")::date AS day,
               COUNT(*)                             AS completions
        FROM   "LessonCompletion"
        WHERE  "tenantId"  = ${tenantId}
          AND  "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP  BY DATE_TRUNC('day', "createdAt")::date
      ) c
      FULL OUTER JOIN (
        SELECT DATE_TRUNC('day', "timestamp")::date AS day,
               SUM("pointsAmount")                  AS points
        FROM   "PointsLedger"
        WHERE  "tenantId"  = ${tenantId}
          AND  "type"      = 'gain'
          AND  "timestamp" >= NOW() - INTERVAL '30 days'
        GROUP  BY DATE_TRUNC('day', "timestamp")::date
      ) p ON c.day = p.day
      ORDER  BY day ASC
    `);

    // Only date formatting happens in Node.js — the aggregation is already done.
    const engagement = rows.map((r) => ({
      date: new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      completions: Number(r.completions),
      points: Number(r.points),
    }));

    return NextResponse.json({
      summary: {
        totalUsers,
        totalCompletions,
        totalPointsAwarded: pointsAwarded._sum.pointsAmount ?? 0,
        totalPointsRedeemed: pointsRedeemed._sum.pointsAmount ?? 0,
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
