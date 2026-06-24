import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    return await client.get<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds = 300): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch {}
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch {}
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    let cursor = '0';
    do {
      const [next, keys]: [string, string[]] = await client.scan(Number(cursor), { match: pattern, count: 100 });
      cursor = String(next);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {}
}

export async function rateLimitCheck(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const client = getRedis();

  if (!client) {
    return { allowed: true, remaining: maxRequests, resetIn: 0 };
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const count = (results[2] as number) || 0;

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining, resetIn: windowSeconds };
  } catch {
    return { allowed: true, remaining: maxRequests, resetIn: 0 };
  }
}
