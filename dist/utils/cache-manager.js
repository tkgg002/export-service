import { createClient } from 'redis';
import crypto from 'crypto';
import SVC_ENV from '../svc-env.ts';
class CacheManager {
    logger;
    l1;
    client;
    ttl;
    prefix;
    constructor(logger) {
        this.logger = logger;
        this.l1 = new Map();
        this.client = null;
        this.ttl = Number(SVC_ENV.get().CACHE_TTL_SECONDS || 60);
        this.prefix = 'export:cache:';
    }
    async connect() {
        const cfg = SVC_ENV.get();
        this.client = createClient({ url: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}` });
        await this.client.connect();
    }
    key(obj) {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        return this.prefix + crypto.createHash('md5').update(str).digest('hex');
    }
    async get(keyObj) {
        const k = this.key(keyObj);
        if (this.l1.has(k))
            return this.l1.get(k);
        if (!this.client)
            return null;
        const v = await this.client.get(k);
        if (v) {
            const parsed = JSON.parse(v);
            this.l1.set(k, parsed);
            return parsed;
        }
        return null;
    }
    async set(keyObj, val) {
        const k = this.key(keyObj);
        this.l1.set(k, val);
        if (this.client)
            await this.client.setEx(k, this.ttl, JSON.stringify(val));
    }
}
export default CacheManager;
//# sourceMappingURL=cache-manager.js.map