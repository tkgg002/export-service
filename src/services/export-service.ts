import CacheService from './cache-service.ts';
import BatchProcessor from './batch-processor.ts';
import batchConfig from '../config/batch.config.ts';
import SVC_ENV from '../../svc-env.ts';
import ExportCenter from '../export-center/ExportCenter.ts';
import { ServiceBroker, Context } from 'moleculer';
import JobTracker from '../../queue/job-tracker.ts';
import CacheManager from '../../utils/cache-manager.ts';
import ExportMetrics from '../../utils/metrics.ts';
import CircuitBreaker from '../../utils/circuit-breaker.ts';

class ExportService {
  private logger: ServiceBroker['logger'];
  private db: any; // TODO: Define a more specific type for db
  public jobTracker: JobTracker;
  private broker: ServiceBroker;
  private cacheManager: CacheManager;
  private metrics: ExportMetrics;
  private circuitBreaker: CircuitBreaker;
  private cacheService: CacheService;
  private batchProcessor: BatchProcessor;
  private exportCenter: ExportCenter;

  constructor({
    logger,
    db,
    redisClient,
    jobTracker,
    cacheManager,
    metrics,
    circuitBreaker,
    broker,
  }: {
    logger: ServiceBroker['logger'];
    db: any; // TODO: Define a more specific type for db
    redisClient: any; // TODO: Define a more specific type for redisClient
    jobTracker: JobTracker;
    cacheManager: CacheManager;
    metrics: ExportMetrics;
    circuitBreaker: CircuitBreaker;
    broker: ServiceBroker;
  }) {
    this.logger = logger;
    this.db = db;
    this.jobTracker = jobTracker;
    this.broker = broker;
    this.cacheManager = cacheManager;
    this.metrics = metrics;
    this.circuitBreaker = circuitBreaker;

    // Cache Service
    this.cacheService = new CacheService(redisClient);

    // Batch Processor
    this.batchProcessor = new BatchProcessor(this);

    // initialize ExportCenter
    this.exportCenter = new ExportCenter({
      logger: this.logger,
      broker: this.broker,
      cacheService: this.cacheService,
      metrics: this.metrics,
      circuitBreaker: this.circuitBreaker,
      jobTracker: this.jobTracker,
    });

    this.logger.info("[ExportService] ExportCenter initialized");
  }

  /**
   * Inject models after DB connected (used for MariaDB)
   */
  setModels(models: any) {
    if (!models) {
      this.logger.warn("[ExportService] Models is null or undefined");
      return;
    }

    // ExportCenter automatically inject if needed (in config)
    this.logger.info("[ExportService] Models injected (handled by ExportCenter)");
  }

  /**
   * Unified export method – called via ExportCenter
   * @param {Object} ctx - Moleculer context
   * @param {Function} onProgress - callback(percentage, processed, total)
   */
  async exportData(ctx: Context, onProgress: Function | null = null) {
    return await this.exportCenter.exportData(ctx, onProgress);
  }

  /**
   * Get all export types
   */
  listExports() {
    return this.exportCenter.listExports();
  }

  /**
   * Helper: generate cache key (if needed)
   */
  generateCacheKey(input: { exportType: string; params: Record<string, any> }) {
    try {
      const cleanParams = { ...input.params };
      ['jobId', 'enableJobTracking', '_cacheBuster'].forEach(k => delete cleanParams[k]);
      const payload = JSON.stringify({
        type: input.exportType,
        params: cleanParams,
      });
      return 'export:manual:' + Buffer.from(payload).toString('base64');
    } catch (err) {
      return `export:fallback:${Date.now()}`;
    }
  }
}

export default ExportService;