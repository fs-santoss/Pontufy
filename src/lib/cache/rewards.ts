import { Redis } from '@upstash/redis';
import { prisma } from '@/backend/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'mock_url',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock_token',
});

const REWARDS_CACHE_KEY = 'global:rewards:catalog';
const CACHE_TTL_SECONDS = 3600;

export async function getRewardsCatalog() {
  try {
    // 1. Tenta recuperar do Redis (Cache-Aside hit)
    const cachedRewards = await redis.get(REWARDS_CACHE_KEY);
    
    if (cachedRewards) {
      console.log('Cache Hit: Retornando catálogo de recompensas do Redis.');
      return cachedRewards;
    }

    // 2. Cache Miss: Busca na API externa/Banco de Dados
    console.log('Cache Miss: Buscando catálogo de recompensas no banco de dados...');
    
    // Simulando um fetch numa API externa de afiliados (Lomadee Wrapper)
    // No nosso MVP, pegamos as recompensas globais (tenantId: null)
    const dbRewards = await prisma.reward.findMany({
      where: {
        tenantId: null,
        isActive: true,
      }
    });

    // 3. Hidrata o cache com TTL rigoroso de 1 hora
    await redis.set(REWARDS_CACHE_KEY, JSON.stringify(dbRewards), { ex: CACHE_TTL_SECONDS });

    return dbRewards;
  } catch (error: any) {
    console.error('Erro ao buscar recompensas (API/DB falhou):', error);
    
    // 4. Stale Cache Fallback (Resiliência)
    // Em caso de falha catastrófica da API ou DB, tenta entregar os dados velhos
    try {
      const staleRewards = await redis.get(REWARDS_CACHE_KEY);
      if (staleRewards) {
         console.warn('Fallback: Retornando dados obsoletos (Stale Cache) da loja.');
         return staleRewards;
      }
    } catch (cacheError) {
       console.error('Falha catastrófica no Redis também.', cacheError);
    }

    // Retorna vazio em vez de crashar a UI (500 Block Error Prevented)
    return [];
  }
}
