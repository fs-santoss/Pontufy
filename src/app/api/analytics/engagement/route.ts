import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const CACHE_TTL_SECONDS = 900; // 15 minutos

export async function GET(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso Restrito: Apenas Gestores de RH.' }, { status: 403 });
    }

    const redis = getRedis();
    const cacheKey = `analytics:engagement:${tenantId}`;

    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return NextResponse.json({ success: true, data: cachedData, source: 'cache' });
        }
      } catch (cacheError) {
        console.warn('[ANALYTICS] Falha ao ler cache Redis, fallback para DB.', cacheError);
      }
    }

    // 2. Cache Miss: Executar Query Pesada no Banco
    const db = getTenantDb(tenantId);

    // AgregaÃ§Ã£o 1: Total de pontos distribuÃ­dos neste mÃªs (Gain)
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

    // AgregaÃ§Ã£o 2: UsuÃ¡rios ativos (que completaram ao menos 1 aula no mÃªs)
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

    if (redis) {
      try {
        await redis.set(cacheKey, analyticsPayload, { ex: CACHE_TTL_SECONDS });
      } catch (cacheError) {
        console.error('[ANALYTICS] Falha ao gravar no cache Redis.', cacheError);
      }
    }

    return NextResponse.json({ success: true, data: analyticsPayload, source: 'database' });

  } catch (error: any) {
    if (error.message === 'NÃ£o autenticado.') {
      return NextResponse.json({ error: 'NÃ£o autenticado.' }, { status: 401 });
    }
    console.error('[ANALYTICS] Erro CrÃ­tico na API de Engajamento:', error);
    return NextResponse.json({ error: 'Falha interna do servidor.' }, { status: 500 });
  }
}
