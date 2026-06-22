import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantPrisma } from '@/backend/db';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'mock_url',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock_token',
});

const CACHE_TTL_SECONDS = 900; // 15 minutos

export async function GET(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso Restrito: Apenas Gestores de RH.' }, { status: 403 });
    }

    const cacheKey = `analytics:engagement:${tenantId}`;

    // 1. Tentar ler do Cache (Resiliência)
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return NextResponse.json({ success: true, data: cachedData, source: 'cache' });
      }
    } catch (cacheError) {
      console.warn('[ANALYTICS] Falha ao ler cache do Redis, executando fallback para Banco de Dados.', cacheError);
    }

    // 2. Cache Miss: Executar Query Pesada no Banco
    const db = getTenantPrisma(tenantId);

    // Agregação 1: Total de pontos distribuídos neste mês (Gain)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const pointsAggregation = await db.pointsLedger.aggregate({
      _sum: {
        pointsAmount: true,
      },
      where: {
        type: 'gain',
        timestamp: {
          gte: startOfMonth,
        }
      }
    });

    // Agregação 2: Usuários ativos (que completaram ao menos 1 aula no mês)
    const activeUsersResult = await db.lessonCompletion.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startOfMonth,
        }
      }
    });

    const analyticsPayload = {
      totalPointsDistributedMonth: pointsAggregation._sum.pointsAmount || 0,
      activeUsersMonth: activeUsersResult.length,
      generatedAt: new Date().toISOString()
    };

    // 3. Hidratar o Cache
    try {
      await redis.set(cacheKey, analyticsPayload, { ex: CACHE_TTL_SECONDS });
    } catch (cacheError) {
      console.error('[ANALYTICS] Falha ao gravar no cache do Redis.', cacheError);
    }

    return NextResponse.json({ success: true, data: analyticsPayload, source: 'database' });

  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('[ANALYTICS] Erro Crítico na API de Engajamento:', error);
    return NextResponse.json({ error: 'Falha interna do servidor.' }, { status: 500 });
  }
}
