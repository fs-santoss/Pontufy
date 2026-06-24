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

/**
 * Tenant-Based Rate Limiter
 * Protects serverless infrastructure and AI billing from single-tenant abuse.
 */
export async function tenantRateLimit(
  tenantId: string, 
  endpoint: string, 
  maxRequests: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; currentCount: number }> {
  
  const redis = getRedis();
  if (!redis) return { allowed: true, currentCount: 0 };

  const windowBucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ratelimit:${tenantId}:${endpoint}:${windowBucket}`;

  const currentCount = await redis.incr(key);
  if (currentCount === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (currentCount > maxRequests) {
    return { allowed: false, currentCount };
  }

  return { allowed: true, currentCount };
}
