import { createClient } from 'redis';
import SVC_ENV from '../svc-env.ts';
import { ServiceBroker } from 'moleculer';

type RedisClientType = ReturnType<typeof createClient>;

class JobTracker {
  private logger: ServiceBroker['logger'];
  private client: RedisClientType | null;

  constructor(logger: ServiceBroker['logger']) {
    this.logger = logger;
    this.client = null;
  }

  async connect() {
    const t0 = Date.now();
    const cfg = SVC_ENV.get();
    this.client = createClient({ url: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}` });
    await this.client.connect();
    const t1 = Date.now();
    this.logger.info(`[JobTracker.connect][t] redisConnect=${t1 - t0}ms`);
  }

  async setStatus(jobId: string, payload: Record<string, any>) {
    const key = `export:job:${jobId}`;
    const stringifiedPayload: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      stringifiedPayload[key] = String(value);
    }
    const t0 = Date.now();
    await this.client!.hSet(key, stringifiedPayload);
    const t1 = Date.now();
    await this.client!.expire(key, 7 * 24 * 3600);
    const t2 = Date.now();
    this.logger.info(`[JobTracker.setStatus][t] hSet=${t1 - t0}ms expire=${t2 - t1}ms total=${t2 - t0}ms id=${jobId}`);
  }

  async getStatus(jobId: string) {
    const key = `export:job:${jobId}`;
    const t0 = Date.now();
    const data = await this.client!.hGetAll(key);
    const t1 = Date.now();
    if (!data || Object.keys(data).length === 0) return {};
    
    const parsedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'percentage' && !isNaN(parseFloat(value))) {
        parsedData[key] = parseFloat(value);
      } else {
        parsedData[key] = value;
      }
    }
    const t2 = Date.now();
    this.logger.info(`[JobTracker.getStatus][t] hGetAll=${t1 - t0}ms parse=${t2 - t1}ms total=${t2 - t0}ms id=${jobId}`);
    return parsedData;
  }
}

export default JobTracker;
