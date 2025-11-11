import path from 'path';
import BaseProcessor from '../export-center/processors/BaseProcessor.ts';
import { Service, Context } from 'moleculer';

export default {
  name: "export.worker",
  settings: {
    concurrency: Number(process.env.MAX_CONCURRENT_EXPORTS || 3),
  },

  actions: {
    run: {
      visibility: "protected" as const,
      params: {
        exportType: "string",
        params: "object",
        jobId: { type: "string", optional: true },
      },
      async handler(this: Service, ctx: Context<{ exportType: string, params: any, jobId?: string }>) {
        const { exportType, params, jobId } = ctx.params;

        let config;
        try {
          const configPath = `../export-center/config/${exportType}.js`;
          const configModule = await import(configPath);
          config = configModule.default;
          if (!config.enabled) throw new Error("Export disabled");
        } catch (err: any) {
          this.logger.error(`[worker] Config load error for ${exportType}: ${err.message}`);
          throw new Error(`Config not found or disabled: ${exportType}`);
        }

        const workerCtx = {
          params: { ...params, exportType },
          meta: ctx.meta,
          call: ctx.call.bind(ctx),
          service: this,
        };

        const onProgress = async (percentage: number, processed: number, total: number) => {
          if (jobId && this.settings.jobTracker) {
            try {
              await this.settings.jobTracker.setStatus(jobId, {
                status: "processing",
                percentage,
                processedRecords: processed,
                totalRecords: total,
              });
            } catch (err: any) {
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

        } catch (error: any) {
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

  created(this: Service) {
    this.logger?.info("[export.worker] Worker created");
  },

  started(this: Service) {
    this.logger?.info("[export.worker] Worker started");
  },
};