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
 * Distributed Mutex Lock using Redis.
 * Prevents race conditions and double-spending on critical redemptions.
 */
export async function acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
  const lockKey = `mutex:${key}`;
  
  // Set NX (Not Exists) ensures only one process acquires the lock.
  // EX sets auto-expiration to prevent deadlocks if the app crashes mid-process.
  const redis = getRedis();
  if (!redis) return false;
  const acquired = await redis.set(lockKey, 'LOCKED', { nx: true, ex: ttlSeconds });
  return acquired === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const lockKey = `mutex:${key}`;
  await redis.del(lockKey);
}
