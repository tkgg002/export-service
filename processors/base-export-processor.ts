import { ExportHelper } from 'goopay-library/helpers/index.js';
import SVC_ENV from '../svc-env.ts';
import moment from 'moment';
import { ServiceBroker, Context } from 'moleculer';

class BaseExportProcessor {
  protected logger: ServiceBroker['logger'];
  protected cache: any;
  protected metrics: any;
  protected circuitBreaker: any;
  protected progressCallback: Function | null;

  constructor({ logger, cacheManager, metrics, circuitBreaker }: { logger: ServiceBroker['logger'], cacheManager: any, metrics: any, circuitBreaker: any }) {
    this.logger = logger;
    this.cache = cacheManager;
    this.metrics = metrics;
    this.circuitBreaker = circuitBreaker;
    this.progressCallback = null;
  }

  setProgressCallback(callback: Function) {
    this.progressCallback = callback;
  }

  async executeExport({
    dataAccessor,
    queryParams,
    columns,
    dataProcessor,
    fileName,
    sheetName,
    ctx,
    dateRange
  }: {
    dataAccessor: any,
    queryParams: any,
    columns: any[],
    dataProcessor: Function,
    fileName: string,
    sheetName: string,
    ctx: Context,
    dateRange: any
  }) {
    const startTime = Date.now();
    try {
      this.progressCallback?.(10);

      const filter = this.buildFilter(queryParams);
      const sort = this.buildSort(queryParams);

      this.progressCallback?.(20);

      const queryExecutor = this.createQueryExecutor(dataAccessor);

      this.progressCallback?.(30);

      const exportData = await ExportHelper
        .configure({ maxBatchSize: Number(SVC_ENV.get().MAX_BATCH_SIZE || 1000) })
        .createExport()
        .withFilter(filter)
        .withSort(sort)
        .withColumns(columns)
        .withAutoFileName(fileName)
        .withSheetName(sheetName)
        .withLangCode(queryParams.langCode || 'vi')
        .withDataProcessor(dataProcessor)
        .withQueryExecutor(queryExecutor)
        .execute(ctx);

      this.progressCallback?.(80);

      const recordCount = Number(exportData?.meta?.recordCount || 0);
      if (recordCount === 0) {
        const duration = Date.now() - startTime;
        this.metrics?.recordExport(duration, true, 0);
        this.progressCallback?.(100);
        return { code: 1, recordCount: 0, message: 'No data in selected range' };
      }

      const result = await ctx.call(
        `${SVC_ENV.get().STORAGE_GATEWAY_SERVICE}.generateExcelStream`,
        exportData.stream,
        { meta: { ...ctx.meta, ...exportData.meta } }
      );

      this.progressCallback?.(95);

      const duration = Date.now() - startTime;
      this.metrics?.recordExport(duration, result.code === 1, result.recordCount || 0);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics?.recordExport(duration, false, 0);
      throw error;
    }
  }

  buildFilter(queryParams: any) { return {}; }

  buildSort(params: any) {
    return params.sortBy && params.sortType ? { [params.sortBy]: +params.sortType } : { createdAt: -1 };
  }

  createQueryExecutor(dataAccessor: any) {
    return async ({ filter, sort, skip, limit }: { filter: any, sort: any, skip: number, limit: number }) => {
      try {
        const data = await dataAccessor.query({ filter, sort, skip, limit });
        return { success: true, data: data || [] };
      } catch (error) {
        this.logger.error(`QueryExecutor error: ${error}`);
        return { success: false, data: [] };
      }
    };
  }
}

export default BaseExportProcessor;
