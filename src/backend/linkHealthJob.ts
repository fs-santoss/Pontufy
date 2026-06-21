// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Background Job: Validação de links de afiliados
// ═══════════════════════════════════════════════════════════════════════
//
// Responsabilidade:
//   1. Iterar sobre todos os produtos ativos de um tenant.
//   2. Fazer HEAD request para verificar disponibilidade (HTTP 200 = ativo).
//   3. Ocultar automaticamente produtos com link quebrado ou fora de estoque.
//   4. Substituir por fallback quando disponível.
//
// Gatilho: Cron job (Vercel Cron / CloudWatch Events / GitHub Actions).
//          Recomendação: a cada 30 min em horário comercial.
// ═══════════════════════════════════════════════════════════════════════

import type {
  TenantId,
  CatalogProduct,
  ProductStatus,
  LinkHealthResult,
} from './types';
import { createLogger } from './logger';
import { resolveTenant } from './tenant';

// ────────────────────────── Mock de catálogo ────────────────────────

/**
 * Simula o catálogo persistido do tenant.
 * Em produção → SELECT * FROM catalog WHERE tenant_id = ? AND status = 'active'
 */
function fetchCatalogForTenant(tenantId: TenantId): CatalogProduct[] {
  return [
    {
      id: 'p1',
      tenantId,
      title: 'Fone de Ouvido Bluetooth Premium',
      partner: 'amazon',
      affiliateUrl: 'https://amzn.to/pontufy-fone-bt',
      pointsRequired: 1200,
      status: 'active',
      lastCheckedAt: new Date().toISOString(),
    },
    {
      id: 'p2',
      tenantId,
      title: 'Cupom R$ 50',
      partner: 'magalu',
      affiliateUrl: 'https://magalu.com/aff/pontufy-cupom50',
      pointsRequired: 800,
      status: 'active',
      lastCheckedAt: new Date().toISOString(),
      fallbackProductId: 'p4',
    },
    {
      id: 'p3',
      tenantId,
      title: 'Cadeira de Escritório Ergonômica',
      partner: 'mercadolivre',
      affiliateUrl: 'https://mercadolivre.com/aff/pontufy-cadeira',
      pointsRequired: 3500,
      status: 'active',
      lastCheckedAt: new Date().toISOString(),
    },
  ];
}

// ─────────────────────── Verificação de saúde ───────────────────────

/**
 * Executa um HEAD request leve no link de afiliado.
 *
 * - Timeout rígido de 5 s para não estourar o orçamento serverless.
 * - Trata 4xx/5xx como "indisponível".
 */
async function checkLink(url: string): Promise<{ httpStatus: number | null; ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      httpStatus: res.status,
      ok: res.status >= 200 && res.status < 400,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      httpStatus: null,
      ok: false,
      error: err.name === 'AbortError' ? 'TIMEOUT' : err.message,
    };
  }
}

// ───────────────────── Ações sobre o catálogo ──────────────────────

/**
 * Placeholder: oculta o produto no banco de dados.
 * Em produção → UPDATE catalog SET status = ? WHERE id = ? AND tenant_id = ?
 */
async function updateProductStatus(
  productId: string,
  tenantId: TenantId,
  newStatus: ProductStatus,
): Promise<void> {
  // Stub — será substituído por chamada ao ORM / query builder
  console.log(JSON.stringify({
    action: 'UPDATE_PRODUCT_STATUS',
    productId,
    tenantId,
    newStatus,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Placeholder: ativa o produto substituto (fallback) no catálogo.
 */
async function activateFallback(
  originalProductId: string,
  fallbackProductId: string,
  tenantId: TenantId,
): Promise<void> {
  console.log(JSON.stringify({
    action: 'ACTIVATE_FALLBACK',
    originalProductId,
    fallbackProductId,
    tenantId,
    timestamp: new Date().toISOString(),
  }));
}

// ═══════════════════════════════ HANDLER ═════════════════════════════

/**
 * Função principal do job de health-check.
 *
 * Pode ser invocada como:
 *   - Vercel Cron → export default handler
 *   - AWS Lambda  → exports.handler = handler
 *   - CLI local   → npx tsx src/backend/linkHealthJob.ts
 */
export async function runLinkHealthCheck(tenantId: TenantId): Promise<LinkHealthResult[]> {
  const log = createLogger(tenantId, 'link-health-job');
  const tenant = resolveTenant(tenantId);
  const catalog = fetchCatalogForTenant(tenantId);

  log.info(`Iniciando health-check para ${catalog.length} produto(s).`, {
    company: tenant.companyName,
  });

  const results: LinkHealthResult[] = [];

  for (const product of catalog) {
    const check = await checkLink(product.affiliateUrl);

    const result: LinkHealthResult = {
      productId:   product.id,
      tenantId,
      url:         product.affiliateUrl,
      httpStatus:  check.httpStatus,
      isAvailable: check.ok,
      checkedAt:   new Date().toISOString(),
      ...(check.error ? { error: check.error } : {}),
    };

    results.push(result);

    // ── Decisão automática ──────────────────────────────────────────
    if (!check.ok) {
      log.warn(`Link indisponível: "${product.title}"`, {
        productId: product.id,
        httpStatus: check.httpStatus,
        error: check.error,
      });

      // Oculta o produto imediatamente
      await updateProductStatus(product.id, tenantId, 'link_broken');

      // Se existe um fallback, ativa-o
      if (product.fallbackProductId) {
        log.info(`Ativando fallback "${product.fallbackProductId}" em lugar de "${product.id}".`);
        await activateFallback(product.id, product.fallbackProductId, tenantId);
      }
    } else {
      log.info(`OK: "${product.title}" (HTTP ${check.httpStatus})`);
    }
  }

  log.info(`Health-check concluído. ${results.filter(r => !r.isAvailable).length} link(s) com falha.`);
  return results;
}

// ─────────────────── Execução direta (dev/CLI) ─────────────────────
// Descomente para rodar localmente: npx tsx src/backend/linkHealthJob.ts
//
// runLinkHealthCheck('tenant_techcorp' as TenantId)
//   .then(r => console.log('Resultados:', JSON.stringify(r, null, 2)))
//   .catch(console.error);
