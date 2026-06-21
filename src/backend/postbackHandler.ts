// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Endpoint Postback: Atribuição de Comissões (Server-Side)
// ═══════════════════════════════════════════════════════════════════════
//
// Responsabilidade:
//   Receber notificações server-to-server (Postback URLs) das redes
//   afiliadas informando que uma venda/conversão ocorreu.
//
// Vantagem do modelo Postback:
//   O rastreamento funciona mesmo com bloqueadores de anúncios, firewalls
//   corporativos, e extensões de privacidade do lado do colaborador,
//   porque a chamada é feita *server → server*, sem depender do browser.
//
// Segurança:
//   1. HMAC-SHA256 de validação para autenticar a origem da rede.
//   2. Verificação de ownership do trackingId (Zero Trust por tenant).
//   3. Idempotência via orderId para evitar dupla contabilização.
// ═══════════════════════════════════════════════════════════════════════

import type {
  TenantId,
  AffiliateNetwork,
  CommissionEvent,
  CommissionStatus,
} from './types';
import { createLogger } from './logger';
import {
  resolveTenant,
  getAffiliateCredential,
  validateTrackingOwnership,
  TenantNotFoundError,
  UnauthorizedTenantAccessError,
} from './tenant';

// ────────────────────── Validação de assinatura ─────────────────────

/**
 * Verifica o HMAC-SHA256 enviado pela rede afiliada no header.
 *
 * Em produção, use a Web Crypto API (disponível em Vercel Edge,
 * Cloudflare Workers e Node 18+).
 */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  // ── Implementação com Web Crypto API ──
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}

// ──────────────────── Idempotência (dedup de orders) ────────────────

/**
 * Set in-memory para MVP. Em produção, use Redis ou DynamoDB
 * com TTL de 72 h para evitar reprocessamento.
 */
const processedOrders = new Set<string>();

function isDuplicate(tenantId: TenantId, orderId: string): boolean {
  const key = `${tenantId}:${orderId}`;
  if (processedOrders.has(key)) return true;
  processedOrders.add(key);
  return false;
}

// ──────────────────────── Persistência stub ─────────────────────────

/**
 * Placeholder: persiste o evento de comissão.
 * Em produção → INSERT INTO commissions (...) VALUES (...)
 */
async function persistCommission(event: CommissionEvent): Promise<void> {
  console.log(JSON.stringify({
    action: 'PERSIST_COMMISSION',
    ...event,
  }));
}

// ═══════════════════════════════ HANDLER ═════════════════════════════

/**
 * Payload esperado no POST body enviado pela rede afiliada.
 */
export interface PostbackPayload {
  network:         AffiliateNetwork;
  tenantId:        string;
  trackingId:      string;  // formato: {tenantId}:{userId}:{ts}
  orderId:         string;
  orderValue:      number;
  commissionValue: number;
  currency:        string;
  status:          CommissionStatus;
}

export interface PostbackResponse {
  success: boolean;
  message: string;
  commissionId?: string;
}

/**
 * Função principal do endpoint de postback.
 *
 * Integra-se como:
 *   - Next.js API Route   → app/api/postback/route.ts
 *   - Vercel Serverless   → api/postback.ts
 *   - AWS Lambda          → exports.handler
 */
export async function handlePostback(
  payload: PostbackPayload,
  signatureHeader: string | null,
): Promise<PostbackResponse> {
  // ── 1. Resolver tenant ────────────────────────────────────────────
  let log;
  try {
    const tenant = resolveTenant(payload.tenantId);
    log = createLogger(tenant.tenantId, 'postback-receiver');

    // ── 2. Validar assinatura HMAC (autenticação da rede) ───────────
    const cred = getAffiliateCredential(payload.tenantId, payload.network);
    const isValid = signatureHeader
      ? await verifySignature(JSON.stringify(payload), signatureHeader, cred.apiSecret)
      : false;

    if (!isValid) {
      log.warn('Assinatura HMAC inválida ou ausente.', {
        network: payload.network,
        orderId: payload.orderId,
      });
      return { success: false, message: 'INVALID_SIGNATURE' };
    }

    // ── 3. Verificar ownership do trackingId (Zero Trust) ───────────
    validateTrackingOwnership(payload.trackingId, payload.tenantId);

    // ── 4. Idempotência — rejeitar orders já processadas ────────────
    if (isDuplicate(tenant.tenantId, payload.orderId)) {
      log.warn('Order já processada (idempotência).', { orderId: payload.orderId });
      return { success: true, message: 'ALREADY_PROCESSED' };
    }

    // ── 5. Extrair userId do trackingId ─────────────────────────────
    const userId = payload.trackingId.split(':')[1];
    if (!userId) {
      log.error('trackingId malformado — userId ausente.', { trackingId: payload.trackingId });
      return { success: false, message: 'MALFORMED_TRACKING_ID' };
    }

    // ── 6. Persistir evento de comissão ─────────────────────────────
    const commissionId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const event: CommissionEvent = {
      id:              commissionId,
      tenantId:        tenant.tenantId,
      network:         payload.network,
      trackingId:      payload.trackingId,
      userId,
      orderId:         payload.orderId,
      orderValue:      payload.orderValue,
      commissionValue: payload.commissionValue,
      currency:        payload.currency,
      status:          payload.status,
      receivedAt:      new Date().toISOString(),
    };

    await persistCommission(event);

    log.info('Comissão registrada com sucesso.', {
      commissionId,
      orderId: payload.orderId,
      commissionValue: payload.commissionValue,
    });

    return { success: true, message: 'OK', commissionId };

  } catch (err: any) {
    // ── Tratamento cirúrgico de erros de domínio ────────────────────
    if (err instanceof TenantNotFoundError) {
      return { success: false, message: 'TENANT_NOT_FOUND' };
    }
    if (err instanceof UnauthorizedTenantAccessError) {
      log?.error('Violação de escopo detectada!', { detail: err.message });
      return { success: false, message: 'SCOPE_VIOLATION' };
    }

    // Erro genérico — nunca vaza stack trace para o chamador
    console.error(JSON.stringify({
      action: 'POSTBACK_UNHANDLED_ERROR',
      error: err.message,
      timestamp: new Date().toISOString(),
    }));
    return { success: false, message: 'INTERNAL_ERROR' };
  }
}
