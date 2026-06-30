import type {
  LinkHealthResult,
} from './types';
import { createLogger } from './logger';
import { prisma } from './db';

/**
 * Executa um HEAD request leve no link de afiliado.
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

/**
 * Função principal do job de health-check.
 */
export async function runLinkHealthCheck(tenantId: string): Promise<LinkHealthResult[]> {
  const log = createLogger(tenantId, 'link-health-job');

  // Buscar catálogo real do banco
  const rewards = await prisma.reward.findMany({
    where: {
      tenantId: { in: [tenantId, null] },
      isActive: true
    }
  });

  log.info(`Iniciando health-check para ${rewards.length} recompensa(s) do tenant ${tenantId}.`);

  const results: LinkHealthResult[] = [];

  for (const reward of rewards) {
    const check = await checkLink(reward.affiliateLink);

    const result: LinkHealthResult = {
      productId:   reward.id,
      tenantId:    tenantId as any,
      url:         reward.affiliateLink,
      httpStatus:  check.httpStatus,
      isAvailable: check.ok,
      checkedAt:   new Date().toISOString(),
      ...(check.error ? { error: check.error } : {}),
    };

    results.push(result);

    if (!check.ok) {
      log.warn(`Link indisponível: "${reward.title}"`, {
        rewardId: reward.id,
        httpStatus: check.httpStatus,
        error: check.error,
      });

      // Desativa a recompensa se o link estiver quebrado
      await prisma.reward.update({
        where: { id: reward.id },
        data: { isActive: false }
      });

      // Nota: Log de Auditoria pode ser adicionado aqui se necessário
    }
  }

  log.info(`Health-check concluído para tenant ${tenantId}. ${results.filter(r => !r.isAvailable).length} falha(s).`);
  return results;
}
