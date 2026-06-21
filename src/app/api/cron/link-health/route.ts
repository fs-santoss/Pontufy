// ═══════════════════════════════════════════════════════════════════════
// Next.js API Route — GET /api/cron/link-health
//
// Gatilho cron para o job de validação de links de afiliados.
// Configure no vercel.json:
//   { "crons": [{ "path": "/api/cron/link-health", "schedule": "*/30 8-20 * * 1-5" }] }
// ═══════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { runLinkHealthCheck } from '@/backend/linkHealthJob';
import type { TenantId } from '@/backend/types';

/**
 * Em produção, a lista de tenants ativos viria do banco.
 * Para o MVP, iteramos sobre um array estático.
 */
const ACTIVE_TENANTS: TenantId[] = [
  'tenant_techcorp' as TenantId,
];

export async function GET(request: NextRequest) {
  // ── Segurança: aceitar apenas chamadas com o token cron correto ──
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const allResults = [];

  for (const tenantId of ACTIVE_TENANTS) {
    const results = await runLinkHealthCheck(tenantId);
    allResults.push({ tenantId, results });
  }

  return NextResponse.json({
    success: true,
    tenantsChecked: ACTIVE_TENANTS.length,
    summary: allResults,
  });
}
