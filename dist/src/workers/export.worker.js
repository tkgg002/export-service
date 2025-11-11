import BaseProcessor from '../export-center/processors/BaseProcessor.ts';
export default {
    name: "export.worker",
    settings: {
        concurrency: Number(process.env.MAX_CONCURRENT_EXPORTS || 3),
    },
    actions: {
        run: {
            visibility: "protected",
            params: {
                exportType: "string",
                params: "object",
                jobId: { type: "string", optional: true },
            },
            async handler(ctx) {
                const { exportType, params, jobId } = ctx.params;
                let config;
                try {
                    const configPath = `../export-center/config/${exportType}.js`;
                    const configModule = await import(configPath);
                    config = configModule.default;
                    if (!config.enabled)
                        throw new Error("Export disabled");
                }
                catch (err) {
                    this.logger.error(`[worker] Config load error for ${exportType}: ${err.message}`);
                    throw new Error(`Config not found or disabled: ${exportType}`);
                }
                const workerCtx = {
                    params: { ...params, exportType },
                    meta: ctx.meta,
                    call: ctx.call.bind(ctx),
                    service: this,
                };
                const onProgress = async (percentage, processed, total) => {
                    if (jobId && this.settings.jobTracker) {
                        try {
                            await this.settings.jobTracker.setStatus(jobId, {
                                status: "processing",
                                percentage,
                                processedRecords: processed,
                                totalRecords: total,
                            });
                        }
                        catch (err) {
                            this.logger.warn("Progress update failed:", err.message);
                        }
                    }
                };
                try {
                    const Processor = config.processor || BaseProcessor;
                    const processor = new Processor({
                        logger: this.logger,
                        config,
                        cacheService: this.settings.cacheService,
                    });
                    const result = await processor.execute(workerCtx, onProgress);
                    if (jobId && this.settings.jobTracker) {
                        await this.settings.jobTracker.setStatus(jobId, {
                            status: "completed",
                            percentage: 100,
                            fileName: result.fileName || "",
                            url: result.url || "",
                            totalRecords: result.totalRecords || 0,
                            completedAt: Date.now(),
                        });
                    }
                    return result;
                }
                catch (error) {
                    if (jobId && this.settings.jobTracker) {
                        await this.settings.jobTracker.setStatus(jobId, {
                            status: "failed",
                            error: error.message,
                            failedAt: Date.now(),
                        });
                    }
                    throw error;
                }
            },
        },
    },
    created() {
        this.logger?.info("[export.worker] Worker created");
    },
    started() {
        this.logger?.info("[export.worker] Worker started");
    },
};
//# sourceMappingURL=export.worker.js.map