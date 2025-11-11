import { Worker } from 'worker_threads';
import path from 'path';
import batchConfig from '../config/batch.config.ts';
import ExportService from './export-service.ts';

class BatchProcessor {
  private exportService: ExportService;

  constructor(exportService: ExportService) {
    this.exportService = exportService;
  }

  async processInBatches(items: any[], processFn: Function, batchSize: number) {
    const results: any[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(item => processFn(item)));
      results.push(...batchResults);
      await this.updateProgress(i + batch.length, items.length);
    }
    return results;
  }

  async processInParallel(items: any[], processFn: Function) {
    const perChunk = Math.ceil(items.length / Math.max(1, batchConfig.maxWorkers));
    const chunks: any[][] = [];
    for (let i = 0; i < items.length; i += perChunk) {
      chunks.push(items.slice(i, i + perChunk));
    }
    const workers = chunks.map(chunk => new Promise<any[]>((resolve) => {
      const worker = new Worker(path.join(__dirname, '../workers/export.worker.js'), {
        workerData: { items: chunk }
      });
      worker.on('message', resolve);
      worker.on('error', () => resolve([]));
    }));
    const results = await Promise.all(workers);
    return results.flat();
  }

  async updateProgress(processed: number, total: number) {
    if (this.exportService?.jobTracker && (this.exportService as any)?.jobId) {
      const percentage = Math.round((processed / Math.max(1, total)) * 100);
      await this.exportService.jobTracker.setStatus((this.exportService as any).jobId, {
        status: 'processing',
        percentage,
        processedRecords: processed,
        totalRecords: total
      });
    }
  }
}

export default BatchProcessor;
