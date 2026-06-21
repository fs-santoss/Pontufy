// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Contratos de tipo para o motor de back-end serverless
// ═══════════════════════════════════════════════════════════════════════

/** Identificador opaco de tenant. Nunca pode ser `undefined` em runtime. */
export type TenantId = string & { readonly __brand: 'TenantId' };

/** Vertical de mercado configurada na contratação. */
export type Sector =
  | 'tech'
  | 'health'
  | 'retail'
  | 'industry';

/** Rede de afiliados integrada. */
export type AffiliateNetwork =
  | 'amazon'
  | 'magalu'
  | 'shopee'
  | 'mercadolivre';

// ───────────────────────────── Tenant ──────────────────────────────

export interface TenantConfig {
  tenantId:       TenantId;
  companyName:    string;
  sector:         Sector;
  /** Tokens de API por rede — cada tenant tem os seus (Zero Trust). */
  affiliateKeys:  Record<AffiliateNetwork, AffiliateCredential>;
}

export interface AffiliateCredential {
  apiKey:    string;
  apiSecret: string;
  /** URL base da rede para chamadas server-side. */
  baseUrl:   string;
  /** ID de publisher/afiliado do tenant nesta rede. */
  publisherId: string;
}

// ──────────────────────── Catálogo / Produto ───────────────────────

export type ProductStatus = 'active' | 'hidden' | 'out_of_stock' | 'link_broken';

export interface CatalogProduct {
  id:               string;
  tenantId:         TenantId;
  title:            string;
  partner:          AffiliateNetwork;
  affiliateUrl:     string;
  pointsRequired:   number;
  status:           ProductStatus;
  lastCheckedAt:    string;   // ISO-8601
  /** Produto substituto sugerido automaticamente, se houver. */
  fallbackProductId?: string;
}

// ──────────────── Comissão / Postback (Rastreamento) ───────────────

export type CommissionStatus = 'pending' | 'approved' | 'rejected';

export interface CommissionEvent {
  id:              string;
  tenantId:        TenantId;
  network:         AffiliateNetwork;
  /** ID de rastreamento gerado pela Pontufy (injetado no link server-side). */
  trackingId:      string;
  userId:          string;
  orderId:         string;
  orderValue:      number;
  commissionValue: number;
  currency:        string;
  status:          CommissionStatus;
  receivedAt:      string;  // ISO-8601
}

// ──────────────── Health-Check (resultado de validação) ────────────

export interface LinkHealthResult {
  productId:   string;
  tenantId:    TenantId;
  url:         string;
  httpStatus:  number | null;
  isAvailable: boolean;
  checkedAt:   string;        // ISO-8601
  error?:      string;
}
