import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'mock_url',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock_token',
});

/**
 * Distributed Mutex Lock using Redis.
 * Prevents race conditions and double-spending on critical redemptions.
 */
export async function acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
  const lockKey = `mutex:${key}`;
  
  // Set NX (Not Exists) ensures only one process acquires the lock.
  // EX sets auto-expiration to prevent deadlocks if the app crashes mid-process.
  const acquired = await redis.set(lockKey, 'LOCKED', { nx: true, ex: ttlSeconds });
  
  return acquired === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `mutex:${key}`;
  await redis.del(lockKey);
}
