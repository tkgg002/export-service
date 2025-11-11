import { Worker } from 'worker_threads';
import path from 'path';
import batchConfig from '../config/batch.config.ts';
class BatchProcessor {
    exportService;
    constructor(exportService) {
        this.exportService = exportService;
    }
    async processInBatches(items, processFn, batchSize) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(item => processFn(item)));
            results.push(...batchResults);
            await this.updateProgress(i + batch.length, items.length);
        }
        return results;
    }
    async processInParallel(items, processFn) {
        const perChunk = Math.ceil(items.length / Math.max(1, batchConfig.maxWorkers));
        const chunks = [];
        for (let i = 0; i < items.length; i += perChunk) {
            chunks.push(items.slice(i, i + perChunk));
        }
        const workers = chunks.map(chunk => new Promise((resolve) => {
            const worker = new Worker(path.join(__dirname, '../workers/export.worker.js'), {
                workerData: { items: chunk }
            });
            worker.on('message', resolve);
            worker.on('error', () => resolve([]));
        }));
        const results = await Promise.all(workers);
        return results.flat();
    }
    async updateProgress(processed, total) {
        if (this.exportService?.jobTracker && this.exportService?.jobId) {
            const percentage = Math.round((processed / Math.max(1, total)) * 100);
            await this.exportService.jobTracker.setStatus(this.exportService.jobId, {
                status: 'processing',
                percentage,
                processedRecords: processed,
                totalRecords: total
            });
        }
    }
}
export default BatchProcessor;
//# sourceMappingURL=batch-processor.js.map