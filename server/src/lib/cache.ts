import { Redis } from "ioredis";
import { LRUCache } from "lru-cache";
import { logger } from "./logger.js";
import { cacheHitsTotal, cacheMissesTotal } from "./metrics.js";

const memory = new LRUCache<string, object>({
  max: 5000,
  ttl: Number(process.env.CACHE_TTL_SECONDS || 3600) * 1000
});

let redis: Redis | null = null;
let redisReady = false;

const ttlSec = Number(process.env.CACHE_TTL_SECONDS || 3600);

export async function initCache(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info({ tier: "memory" }, "cache: using in-memory LRU only (REDIS_URL unset)");
    return;
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 2000,
    retryStrategy() {
      return null;
    }
  });
  try {
    await client.ping();
    redis = client;
    redisReady = true;
    redis.on("error", (err: Error) => {
      logger.warn({ err: err.message }, "cache: redis error");
    });
    logger.info({ tier: "redis" }, "cache: redis connected");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message }, "cache: redis unavailable, using memory only");
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }
    redis = null;
    redisReady = false;
  }
}

export async function getCache(key: string): Promise<unknown | null> {
  if (redis && redisReady) {
    try {
      const v = await redis.get(key);
      if (v != null) {
        cacheHitsTotal.labels("redis").inc();
        return JSON.parse(v) as unknown;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, key }, "cache: redis get failed");
    }
  }
  const mem = memory.get(key);
  if (mem != null) {
    cacheHitsTotal.labels("memory").inc();
    return mem;
  }
  cacheMissesTotal.inc();
  return null;
}

export async function setCache(key: string, value: object): Promise<void> {
  memory.set(key, value);
  if (redis && redisReady) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSec);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, key }, "cache: redis set failed");
    }
  }
}

export async function shutdownCache(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      /* ignore */
    }
  }
}
