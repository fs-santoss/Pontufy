import { Redis } from '@upstash/redis';
import { prisma } from '@/backend/db';

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const REWARDS_CACHE_KEY = 'global:rewards:catalog';
const CACHE_TTL_SECONDS = 3600;

export async function getRewardsCatalog() {
  const redis = getRedis();
  try {
    if (redis) {
      const cachedRewards = await redis.get(REWARDS_CACHE_KEY);
      if (cachedRewards) return cachedRewards;
    }

    const dbRewards = await prisma.reward.findMany({
      where: { tenantId: null, isActive: true },
    });

    if (redis) {
      await redis.set(REWARDS_CACHE_KEY, JSON.stringify(dbRewards), { ex: CACHE_TTL_SECONDS });
    }

    return dbRewards;
  } catch (error: any) {
    console.error('Erro ao buscar recompensas:', error);
    if (redis) {
      try {
        const stale = await redis.get(REWARDS_CACHE_KEY);
        if (stale) return stale;
      } catch {}
    }
    return [];
  }
}
