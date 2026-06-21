// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Resolução de contexto de tenant (Zero Trust)
// ═══════════════════════════════════════════════════════════════════════
import type { TenantConfig, TenantId, AffiliateNetwork } from './types';

/**
 * Mock de configurações por tenant.
 *
 * Em produção, este mapa será substituído por uma consulta
 * ao banco de dados (DynamoDB, Firestore, Supabase etc.)
 * dentro do contexto da invocação serverless.
 */
const TENANT_STORE: Record<string, TenantConfig> = {
  'tenant_techcorp': {
    tenantId: 'tenant_techcorp' as TenantId,
    companyName: 'TechCorp Solutions',
    sector: 'tech',
    affiliateKeys: {
      amazon: {
        apiKey: 'ak_amazon_techcorp_xxx',
        apiSecret: 'as_amazon_techcorp_xxx',
        baseUrl: 'https://api.amazon.com.br/affiliate/v1',
        publisherId: 'pontufy-techcorp-01',
      },
      magalu: {
        apiKey: 'ak_magalu_techcorp_xxx',
        apiSecret: 'as_magalu_techcorp_xxx',
        baseUrl: 'https://api.magazineluiza.com.br/affiliate/v1',
        publisherId: 'pontufy-techcorp-02',
      },
      shopee: {
        apiKey: 'ak_shopee_techcorp_xxx',
        apiSecret: 'as_shopee_techcorp_xxx',
        baseUrl: 'https://open.shopee.com.br/api/v2',
        publisherId: 'pontufy-techcorp-03',
      },
      mercadolivre: {
        apiKey: 'ak_meli_techcorp_xxx',
        apiSecret: 'as_meli_techcorp_xxx',
        baseUrl: 'https://api.mercadolibre.com',
        publisherId: 'pontufy-techcorp-04',
      },
    },
  },
};

// ───────────────────────── Erros de domínio ─────────────────────────

export class TenantNotFoundError extends Error {
  constructor(id: string) {
    super(`Tenant não encontrado: ${id}`);
    this.name = 'TenantNotFoundError';
  }
}

export class UnauthorizedTenantAccessError extends Error {
  constructor(expected: string, received: string) {
    super(`Violação de escopo: esperava tenant "${expected}", recebeu "${received}".`);
    this.name = 'UnauthorizedTenantAccessError';
  }
}

// ──────────────────────── Funções públicas ──────────────────────────

/**
 * Resolve a configuração completa do tenant pelo ID.
 * Lança `TenantNotFoundError` se o tenant não existir.
 */
export function resolveTenant(tenantId: string): TenantConfig {
  const config = TENANT_STORE[tenantId];
  if (!config) throw new TenantNotFoundError(tenantId);
  return config;
}

/**
 * Retorna credenciais de afiliado de um tenant para uma rede específica.
 * Garante que o acesso só ocorra dentro do escopo correto (Zero Trust).
 */
export function getAffiliateCredential(
  tenantId: string,
  network: AffiliateNetwork,
) {
  const tenant = resolveTenant(tenantId);
  return tenant.affiliateKeys[network];
}

/**
 * Valida que o token de rastreamento (trackingId) pertence
 * ao tenant que está reivindicando a comissão.
 *
 * Formato esperado do trackingId: `{tenantId}:{userId}:{timestamp}`
 */
export function validateTrackingOwnership(
  trackingId: string,
  claimedTenantId: string,
): boolean {
  const ownerTenantId = trackingId.split(':')[0];
  if (ownerTenantId !== claimedTenantId) {
    throw new UnauthorizedTenantAccessError(claimedTenantId, ownerTenantId);
  }
  return true;
}
