import type { Logger, ExportConfig, CacheService } from '../../types/export-center.d.ts';
import type { BaseProcessorConstructorParams, DataAccessObject } from '../../types/base-processor.d.ts';
import path from 'path';

class BaseProcessor {
  protected logger: Logger;
  protected config: ExportConfig;
  protected cacheService: CacheService;

  constructor({ logger, config, cacheService }: BaseProcessorConstructorParams) {
    this.logger = logger;
    this.config = config;
    this.cacheService = cacheService;
  }

  async execute(ctx: any, onProgress: Function | null): Promise<{ fileName: string; url: string; totalRecords: number }> {
    const { params } = ctx;
    const dataAccessPath = (this.config as any).dataAccess;
    const DAOModule = await import(path.resolve(dataAccessPath));
    const DAO: { new(args: { logger: Logger }): DataAccessObject } = DAOModule.default;
    const dao = new DAO({ logger: this.logger });

    let filters: any = { ...(this.config as any).defaultFilters };
    if ((this as any).buildFilter) {
      filters = { ...filters, ...(this as any).buildFilter(params) };
    }
    this.logger.info(`Data Access filter: ${JSON.stringify(filters)}`);
    const total = await dao.count(filters);

    if (onProgress) await onProgress(0, 0, total);

    const rows: any[] = [];
    const batchSize = 1000;
    let processed = 0;

    for (let offset = 0; offset < total; offset += batchSize) {
      const data = await dao.find({ ...filters, limit: batchSize, offset });
      const transformed = data.map((row: any) =>
        (this.config as any).transform ? (this.config as any).transform(row) : row
      );
      rows.push(...transformed);
      processed += data.length;
      if (onProgress) await onProgress(Math.round((processed / total) * 100), processed, total);
    }

    const fileName = `${this.config.exportType}_${Date.now()}.xlsx`;
    const url = await ctx.call('storage-gateway.upload', {
      fileName,
      data: rows,
      columns: typeof (this.config as any).columns === 'function'
        ? (this.config as any).columns(params.langCode || 'vi')
        : (this.config as any).columns,
    });

    return { fileName, url, totalRecords: total };
  }
}

export default BaseProcessor;