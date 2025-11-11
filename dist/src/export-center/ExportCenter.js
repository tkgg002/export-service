import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BaseProcessor from './processors/BaseProcessor.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class ExportCenter {
    logger;
    broker;
    cacheService;
    metrics;
    circuitBreaker;
    jobTracker;
    exports;
    constructor({ logger, broker, cacheService, metrics, circuitBreaker, jobTracker }) {
        this.logger = logger;
        this.broker = broker;
        this.cacheService = cacheService;
        this.metrics = metrics;
        this.circuitBreaker = circuitBreaker;
        this.jobTracker = jobTracker;
        this.exports = new Map();
        this.loadAllExports();
    }
    async loadAllExports() {
        const configDir = path.join(__dirname, 'config');
        if (!fs.existsSync(configDir)) {
            this.logger.warn(`[ExportCenter] Config dir not found: ${configDir}`);
            return;
        }
        const files = fs.readdirSync(configDir).filter(f => f.endsWith('.ts') && f !== 'template.ts');
        for (const file of files) {
            const exportType = file.replace('.ts', '');
            try {
                const configModule = await import(path.join(configDir, file));
                const config = configModule.default;
                if (!config.enabled)
                    continue;
                this.exports.set(exportType, {
                    ...config,
                    exportType,
                    cacheKey: (params) => this.makeCacheKey(exportType, params),
                });
                this.logger.info(`[ExportCenter] Đã nạp: ${exportType}`);
            }
            catch (err) {
                this.logger.error(`[ExportCenter] Lỗi nạp config ${file}:`, err.message);
            }
        }
        this.logger.info(`[ExportCenter] Tổng cộng: ${this.exports.size} loại export`);
    }
    getConfig(type) {
        const config = this.exports.get(type);
        if (!config)
            throw new Error(`Export type không tồn tại: ${type}`);
        return config;
    }
    makeCacheKey(type, params) {
        const clean = { ...params };
        ['jobId', 'enableJobTracking', '_cacheBuster'].forEach(k => delete clean[k]);
        const payload = JSON.stringify({ type, params: clean });
        return `export:v4:${Buffer.from(payload).toString('base64')}`;
    }
    async exportData(ctx, onProgress = null) {
        const { exportType, jobId, enableJobTracking = false } = ctx.params;
        if (!exportType)
            throw new Error("exportType is required");
        const config = this.getConfig(exportType);
        const cacheKey = config.cacheKey(ctx.params);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.info(`[Export] Cache HIT: ${cacheKey}`);
            return cached;
        }
        if (enableJobTracking && this.jobTracker && jobId) {
            await this.jobTracker.setStatus(jobId, {
                status: "processing",
                percentage: 0,
                processedRecords: 0,
                totalRecords: 0,
            });
        }
        try {
            let result;
            if (config.useWorker && this.broker) {
                result = await this.broker.call('export.worker.run', {
                    exportType,
                    params: ctx.params,
                    jobId,
                });
            }
            else {
                const Processor = config.processor || BaseProcessor;
                const processor = new Processor({ logger: this.logger, config, cacheService: this.cacheService });
                result = await processor.execute(ctx, onProgress);
            }
            this.logger.info(`[ExportCenter] Data retrieved from processor, totalRecords: ${result.totalRecords}`);
            await this.cacheService.set(cacheKey, result, config.cacheTTL || 3600);
            if (enableJobTracking && this.jobTracker && jobId) {
                await this.jobTracker.setStatus(jobId, {
                    status: "completed",
                    percentage: 100,
                    fileName: result.fileName || "",
                    url: result.url || "",
                    totalRecords: result.totalRecords || 0,
                    completedAt: Date.now(),
                });
            }
            this.logger.info(`[Export] Hoàn thành: ${exportType}, records: ${result.totalRecords}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[Export] Lỗi [${exportType}]:`, error);
            if (enableJobTracking && this.jobTracker && jobId) {
                await this.jobTracker.setStatus(jobId, {
                    status: "failed",
                    error: error.message,
                    failedAt: Date.now(),
                });
            }
            throw error;
        }
    }
    listExports() {
        return Array.from(this.exports.keys());
    }
}
export default ExportCenter;
//# sourceMappingURL=ExportCenter.js.map