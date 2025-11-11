import type { Logger, ExportConfig, CacheService } from './export-center.d.ts';

export interface BaseProcessorConstructorParams {
  logger: Logger;
  config: ExportConfig;
  cacheService: CacheService;
}

export interface DataAccessObject {
  count(filters: any): Promise<number>;
  find(options: any): Promise<any[]>;
}