import type {
  AffiliateNetwork,
  CommissionStatus,
} from './types';
import {
  processAffiliateCommission,
  verifyAffiliateSignature,
  AffiliateServiceResponse
} from './affiliateService';
import { getAffiliateCredential } from './tenant';

/**
 * Interface original mantida para compatibilidade,
 * mas agora delegando para affiliateService.
 */
export interface PostbackPayload {
  network:         AffiliateNetwork;
  tenantId:        string;
  trackingId:      string;
  orderId:         string;
  orderValue:      number;
  commissionValue: number;
  currency:        string;
  status:          CommissionStatus;
}

export interface PostbackResponse extends AffiliateServiceResponse {
  // Ensuring it's not an empty interface
  _compat?: boolean;
}

/**
 * Função mantida para compatibilidade com possíveis chamadores internos,
 * agora utilizando a lógica centralizada no banco de dados.
 */
export async function handlePostback(
  payload: PostbackPayload,
  signatureHeader: string | null,
): Promise<PostbackResponse> {

  // Verificação de assinatura (opcional, baseada em configuração do tenant)
  if (signatureHeader) {
    try {
      const cred = getAffiliateCredential(payload.tenantId, payload.network);
      if (cred?.apiSecret) {
        const isValid = await verifyAffiliateSignature(
          JSON.stringify(payload),
          signatureHeader,
          cred.apiSecret
        );
        if (!isValid) return { success: false, message: 'INVALID_SIGNATURE' };
      }
    } catch {
      // Falha silenciosa na resolução de credenciais se não configuradas
    }
  }

  return processAffiliateCommission({
    network: payload.network,
    trackingId: payload.trackingId,
    orderId: payload.orderId,
    orderValue: payload.orderValue,
    commissionValue: payload.commissionValue,
    status: payload.status as any,
  });
}
