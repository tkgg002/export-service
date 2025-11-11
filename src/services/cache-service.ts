import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

class CacheService {
  private redis: RedisClientType | null;
  private localCache: Map<string, any>;
  private localTTL: number;

  constructor(redisClient: RedisClientType | null) {
    this.redis = redisClient;
    this.localCache = new Map();
    this.localTTL = 60000;
  }

  async get(key: string): Promise<any | null> {
    const localItem = this.localCache.get(key);
    if (localItem && Date.now() < localItem.expires) {
      return localItem.value;
    }
    if (this.redis) {
      const data = await this.redis.get(`export:cache:${key}`);
      if (data) {
        const parsed = JSON.parse(data);
        this.localCache.set(key, { value: parsed, expires: Date.now() + this.localTTL });
        return parsed;
      }
    }
    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const cacheItem = { value, expires: Date.now() + ttl * 1000 };
    this.localCache.set(key, cacheItem);
    if (this.redis) {
      await this.redis.set(`export:cache:${key}`, JSON.stringify(value), { EX: ttl });
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys(`export:cache:${pattern}`);
      if (keys && keys.length) {
        await this.redis.del(keys);
      }
    }
    for (const k of this.localCache.keys()) {
      if (k.includes(pattern)) this.localCache.delete(k);
    }
  }
}

export default CacheService;
