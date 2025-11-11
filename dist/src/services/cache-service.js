class CacheService {
    redis;
    localCache;
    localTTL;
    constructor(redisClient) {
        this.redis = redisClient;
        this.localCache = new Map();
        this.localTTL = 60000;
    }
    async get(key) {
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
    async set(key, value, ttl = 3600) {
        const cacheItem = { value, expires: Date.now() + ttl * 1000 };
        this.localCache.set(key, cacheItem);
        if (this.redis) {
            await this.redis.set(`export:cache:${key}`, JSON.stringify(value), { EX: ttl });
        }
    }
    async invalidate(pattern) {
        if (this.redis) {
            const keys = await this.redis.keys(`export:cache:${pattern}`);
            if (keys && keys.length) {
                await this.redis.del(keys);
            }
        }
        for (const k of this.localCache.keys()) {
            if (k.includes(pattern))
                this.localCache.delete(k);
        }
    }
}
export default CacheService;
//# sourceMappingURL=cache-service.js.map