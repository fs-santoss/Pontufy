import { NextRequest, NextResponse } from 'next/server';
import { runLinkHealthCheck } from '@/backend/linkHealthJob';
import { prisma } from '@/backend/db';

export async function GET(request: NextRequest) {
  // ── Segurança: aceitar apenas chamadas com o token cron correto ──
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Fetch all active tenants from database
  const activeTenants = await prisma.tenant.findMany({
    where: { contractStatus: 'active' },
    select: { id: true, name: true }
  });

  const allResults = [];

  for (const tenant of activeTenants) {
    const results = await runLinkHealthCheck(tenant.id);
    allResults.push({ tenantId: tenant.id, name: tenant.name, results });
  }

  return NextResponse.json({
    success: true,
    tenantsChecked: activeTenants.length,
    summary: allResults,
  });
}
