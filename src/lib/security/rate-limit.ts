import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'mock_url',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock_token',
});

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
  
  // Current time window key (e.g., minute window)
  const windowBucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ratelimit:${tenantId}:${endpoint}:${windowBucket}`;

  // Increment counter atomically
  const currentCount = await redis.incr(key);

  // Set TTL on the first request to automatically expire the window
  if (currentCount === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (currentCount > maxRequests) {
    return { allowed: false, currentCount };
  }

  return { allowed: true, currentCount };
}
