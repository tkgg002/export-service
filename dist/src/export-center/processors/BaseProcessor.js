import path from 'path';
class BaseProcessor {
    logger;
    config;
    cacheService;
    constructor({ logger, config, cacheService }) {
        this.logger = logger;
        this.config = config;
        this.cacheService = cacheService;
    }
    async execute(ctx, onProgress) {
        const { params } = ctx;
        const dataAccessPath = this.config.dataAccess;
        const DAOModule = await import(path.resolve(dataAccessPath));
        const DAO = DAOModule.default;
        const dao = new DAO({ logger: this.logger });
        let filters = { ...this.config.defaultFilters };
        if (this.buildFilter) {
            filters = { ...filters, ...this.buildFilter(params) };
        }
        this.logger.info(`Data Access filter: ${JSON.stringify(filters)}`);
        const total = await dao.count(filters);
        if (onProgress)
            await onProgress(0, 0, total);
        const rows = [];
        const batchSize = 1000;
        let processed = 0;
        for (let offset = 0; offset < total; offset += batchSize) {
            const data = await dao.find({ ...filters, limit: batchSize, offset });
            const transformed = data.map((row) => this.config.transform ? this.config.transform(row) : row);
            rows.push(...transformed);
            processed += data.length;
            if (onProgress)
                await onProgress(Math.round((processed / total) * 100), processed, total);
        }
        const fileName = `${this.config.exportType}_${Date.now()}.xlsx`;
        const url = await ctx.call('storage-gateway.upload', {
            fileName,
            data: rows,
            columns: typeof this.config.columns === 'function'
                ? this.config.columns(params.langCode || 'vi')
                : this.config.columns,
        });
        return { fileName, url, totalRecords: total };
    }
}
export default BaseProcessor;
//# sourceMappingURL=BaseProcessor.js.map