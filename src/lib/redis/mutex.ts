import { getRedis } from '@/lib/redis';

/**
 * Distributed Mutex Lock using Redis.
 * Prevents race conditions and double-spending on critical transactions.
 */
export async function acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  // SET NX: only one process acquires; EX auto-expires to prevent deadlocks.
  const acquired = await redis.set(`mutex:${key}`, 'LOCKED', { nx: true, ex: ttlSeconds });
  return acquired === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`mutex:${key}`);
}
