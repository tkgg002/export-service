import { createClient } from 'redis';
import SVC_ENV from '../svc-env.ts';
import { ServiceBroker } from 'moleculer';

type RedisClientType = ReturnType<typeof createClient>;

class JobQueue {
  private logger: ServiceBroker['logger'];
  private client: RedisClientType | null;
  private enqueueClient: RedisClientType | null;
  private queueKey: string;
  private isProcessing: boolean;

  constructor(logger: ServiceBroker['logger']) {
    this.logger = logger;
    this.client = null;
    this.enqueueClient = null;
    this.queueKey = 'export:queue:large';
    this.isProcessing = false;
  }

  async connect() {
    const t0 = Date.now();
    const cfg = SVC_ENV.get();
    const clientConfig = {
      url: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}`,
      socket: { noDelay: true, keepAlive: 5000 }
    };
    this.client = createClient(clientConfig);
    this.enqueueClient = createClient(clientConfig);
    await this.client.connect();
    await this.enqueueClient.connect();
    const t1 = Date.now();
    this.logger.info(`[JobQueue.connect][t] redisConnect=${t1 - t0}ms`);
  }

  async enqueue(job: any) {
    const t0 = Date.now();
    await this.enqueueClient!.rPush(this.queueKey, JSON.stringify(job));
    const t1 = Date.now();
    this.logger.info(`[JobQueue.enqueue][t] rPush=${t1 - t0}ms id=${job?.id}`);
    return job.id;
  }

  async process(handler: (job: any) => Promise<void>, concurrency = 1) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const workers = Array.from({ length: concurrency }).map(() => this.workerLoop(handler));
    await Promise.all(workers);
  }

  async workerLoop(handler: (job: any) => Promise<void>) {
    while (this.isProcessing) {
      let res;
      try {
        res = await this.client!.blPop(this.queueKey, 1);
      } catch (e) {
        this.logger.error("BLPOP error:", e);
        continue;
      }
      if (!res) continue;
      const payload = (res && typeof res === 'object' && !Array.isArray(res)) ? res.element : (Array.isArray(res) ? res[1] : null);
      if (!payload) continue;
      let job;
      try { job = JSON.parse(payload); } catch { continue; }
      try { await handler(job); } catch (e) { this.logger.error(e); }
    }
  }

  async disconnect() {
    this.isProcessing = false;
    try { if (this.enqueueClient) await this.enqueueClient.quit(); } catch {}
    try { if (this.client) await this.client.quit(); } catch {}
  }
}

export default JobQueue;
