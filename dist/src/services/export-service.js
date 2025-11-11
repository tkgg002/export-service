import CacheService from './cache-service.ts';
import BatchProcessor from './batch-processor.ts';
import ExportCenter from '../export-center/ExportCenter.ts';
class ExportService {
    logger;
    db;
    jobTracker;
    broker;
    cacheManager;
    metrics;
    circuitBreaker;
    cacheService;
    batchProcessor;
    exportCenter;
    constructor({ logger, db, redisClient, jobTracker, cacheManager, metrics, circuitBreaker, broker, }) {
        this.logger = logger;
        this.db = db;
        this.jobTracker = jobTracker;
        this.broker = broker;
        this.cacheManager = cacheManager;
        this.metrics = metrics;
        this.circuitBreaker = circuitBreaker;
        this.cacheService = new CacheService(redisClient);
        this.batchProcessor = new BatchProcessor(this);
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
    setModels(models) {
        if (!models) {
            this.logger.warn("[ExportService] Models is null or undefined");
            return;
        }
        this.logger.info("[ExportService] Models injected (handled by ExportCenter)");
    }
    async exportData(ctx, onProgress = null) {
        return await this.exportCenter.exportData(ctx, onProgress);
    }
    listExports() {
        return this.exportCenter.listExports();
    }
    generateCacheKey(input) {
        try {
            const cleanParams = { ...input.params };
            ['jobId', 'enableJobTracking', '_cacheBuster'].forEach(k => delete cleanParams[k]);
            const payload = JSON.stringify({
                type: input.exportType,
                params: cleanParams,
            });
            return 'export:manual:' + Buffer.from(payload).toString('base64');
        }
        catch (err) {
            return `export:fallback:${Date.now()}`;
        }
    }
}
export default ExportService;
//# sourceMappingURL=export-service.js.map