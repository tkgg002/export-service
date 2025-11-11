import { Service, Context, ServiceBroker, ActionSchema } from "moleculer";
import { v4 as uuidv4 } from "uuid";
import MongoDb from "../../dbHandler/mongo.js";
import * as modelsIndex from "../../models/index.js";
import * as middlewares from "../../middlewares/index.js";
import SVC_ENV from "../../svc-env.js";
import JobQueue from "../../queue/job-queue.js";
import JobTracker from "../../queue/job-tracker.js";
import CircuitBreaker from "../../utils/circuit-breaker.js";
import CacheManager from "../../utils/cache-manager.js";
import ExportMetrics from "../../utils/metrics.js";
import MainExportService from "./export-service.js";
import ExportWorker from "../workers/export.worker.js";

const ServiceName = "export-service";
const JOB_TIMEOUT_MS = 30 * 60 * 1000;

const ExportServiceSchema = {
    name: ServiceName,
    settings: {
        port: 9020,
        logging: true,
    },
    actions: {
        healthCheck: {
          rest: "GET /health",
          async handler(this: Service) {
            const checks: any = { db: { status: "unknown" }, storage: { status: "unknown" } };

            try {
              if ((this as any).dbMain) {
                const start = Date.now();
                await (this as any).dbMain.authenticate();
                checks.db = { status: "healthy", latency: Date.now() - start };
              } else {
                checks.db = { status: "uninitialized" };
              }
            } catch (e: any) {
              checks.db = { status: "unhealthy", error: e.message };
            }

            try {
              const service = SVC_ENV.get().STORAGE_GATEWAY_SERVICE || "storage-gateway";
              const start = Date.now();
              await this.broker.call(`${service}.ping`);
              checks.storage = { status: "healthy", latency: Date.now() - start };
            } catch (e: any) {
              checks.storage = { status: "unhealthy", error: e.message };
            }

            return { code: 1, checks };
          },
        },

        exportPaymentBills: {
          params: {
            enableJobTracking: { type: "boolean", default: false, convert: true },
            jobId: { type: "string", optional: true },
            dateFr: { type: "string", optional: true },
            dateTo: { type: "string", optional: true },
            merchantId: { type: "string", optional: true },
            channelID: { type: "string", optional: true },
            merchantEmail: { type: "string", optional: true },
            apiType: { type: "string", optional: true },
            state: { type: "string", optional: true },
            langCode: { type: "string", default: "vi" },
          },
          async handler(this: Service, ctx: any) { return (this as any).handleExportAction(ctx, "payment-bills") },
        },

        exportListTransHis: {
          params: {
            enableJobTracking: { type: "boolean", default: false, convert: true },
            jobId: { type: "string", optional: true },
          },
          async handler(this: Service, ctx: any) { return (this as any).handleExportAction(ctx, "wallet-transactions") },
        },

        exportData: {
          desc: "Xuất dữ liệu theo loại (payment-bills, wallet-transactions, ...)",
          params: {
            exportType: { type: "string" },
            enableJobTracking: { type: "boolean", default: false, convert: true },
            jobId: { type: "string", optional: true },
            dateFr: { type: "string", optional: true },
            dateTo: { type: "string", optional: true },
            langCode: { type: "string", default: "vi" },
          },
          async handler(this: Service, ctx: any) { return (this as any).handleExportAction(ctx, ctx.params.exportType) },
        },

        getMetrics: {
          desc: "Lấy metrics của service",
          async handler(this: Service) { return (this as any).metrics?.toJSON() || {} },
        },

        getJobStatus: {
          desc: "Lấy trạng thái job",
          params: { jobId: { type: "string" } },
          async handler(this: Service, ctx: any) {
            const data = await (this as any).jobTracker.getStatus(ctx.params.jobId);
            return { jobId: ctx.params.jobId, ...data };
          },
        },

        listExports: {
          desc: "Liệt kê tất cả loại export",
          async handler(this: Service) { return (this as any).exportService.listExports() },
        },
    },
    methods: {
        async handleExportAction(this: Service, ctx: Context<any>, exportType: string) {
            if (!exportType) throw new Error("exportType is required");

            const enableJobTracking = this.normalizeBool(ctx.params.enableJobTracking);
            this.logger.info(`[handleExportAction] type=${exportType}, enableJobTracking=${enableJobTracking}`);

            ctx.params.exportType = exportType;
            ctx.params.enableJobTracking = enableJobTracking;

            if (enableJobTracking) {
              const jobId = ctx.params.jobId || uuidv4();
              await (this as any).jobTracker.setStatus(jobId, {
                status: "queued",
                percentage: 0,
                processedRecords: 0,
                totalRecords: 0,
              });

              const job = {
                id: jobId,
                type: exportType,
                params: { ...ctx.params },
                enqueuedAt: Date.now(),
              };

              await (this as any).jobQueue.enqueue(job);
              this.logger.info(`[handleExportAction] Job queued: ${jobId}`);
              return { jobId, status: "queued" };
            }

            return await (this as any).exportService.exportData(ctx);
        },
        async processExportJob(this: Service, job: any) {
            const { id, type, params } = job;
            const timeout = setTimeout(() => {
              this.logger.error(`Job timed out: ${id}`);
            }, JOB_TIMEOUT_MS);

            try {
              await (this as any).jobTracker.setStatus(id, { status: "processing", percentage: 0 });

              const onProgress = async (percentage: number, processed = 0, total = 0) => {
                try {
                  await (this as any).jobTracker.setStatus(id, {
                    status: "processing",
                    percentage,
                    processedRecords: processed,
                    totalRecords: total,
                  });
                } catch (err: any) {
                  this.logger.warn("Cập nhật progress thất bại:", err.message);
                }
              };

              const safeParams = {
                ...params,
                enableJobTracking: false,
                jobId: id,
                exportType: type,
              };
              
              const actionEndpoint = this.broker.findNextActionEndpoint("export-service.exportData");
              if (!actionEndpoint || actionEndpoint instanceof Error) {
                throw new Error("`export-service.exportData` action not found in registry.");
              }
              const ctx = Context.create(this.broker, actionEndpoint, safeParams);
              
              const result = await (this as any).exportService.exportData(ctx, onProgress);

              await (this as any).jobTracker.setStatus(id, {
                status: "completed",
                percentage: 100,
                fileName: result?.fileName || "",
                url: result?.url || "",
                totalRecords: result?.totalRecords || 0,
                completedAt: Date.now(),
              });

              this.logger.info(`Job hoàn thành: ${id}`);
              return result;
            } catch (error: any) {
              await (this as any).jobTracker.setStatus(id, {
                status: "failed",
                error: error.message,
                failedAt: Date.now(),
              });
              this.logger.error(`Job thất bại [${id}]:`, error.message);
              throw error;
            } finally {
              clearTimeout(timeout);
            }
        },
        normalizeBool(v: any): boolean {
            if (typeof v === "boolean") return v;
            if (v == null) return false;
            const s = String(v).toLowerCase();
            return ["true", "1", "on", "yes"].includes(s);
        },
        async initService(this: Service) {
            const dbHandler = new MongoDb(this.logger);

            try {
              const dbConnection = await dbHandler.connect();
              if (!dbConnection) {
                throw new Error("Connect to database error, please check MONGO_URI at .run.env");
              }

              const models = modelsIndex.init(dbConnection as any, this.logger);
              (this as any).dbMain = dbConnection;

              (this as any).cacheManager = new CacheManager(this.logger);
              (this as any).metrics = new ExportMetrics();

              try {
                await (this as any).cacheManager.connect();
                this.logger.info("Cache kết nối thành công");
              } catch (e: any) {
                this.logger.warn("Cache không khả dụng:", e.message);
              }

              (this as any).circuitBreaker = new CircuitBreaker({
                failureThreshold: Number(SVC_ENV.get().CB_FAILURE_THRESHOLD || 10),
                recoveryTimeout: Number(SVC_ENV.get().CB_RECOVERY_TIMEOUT || 300000),
                logger: this.logger,
              });

              (this as any).jobQueue = new JobQueue(this.logger);
              (this as any).jobTracker = new JobTracker(this.logger);

              try {
                await Promise.all([(this as any).jobQueue.connect(), (this as any).jobTracker.connect()]);
                this.logger.info("Redis (Queue & Tracker) kết nối thành công");
              } catch (e: any) {
                this.logger.warn("Redis không khả dụng:", e.message);
              }

              (this as any).exportService = new MainExportService({
                logger: this.logger,
                db: dbConnection,
                redisClient: ((this as any).jobTracker as any)?.client || null,
                jobTracker: (this as any).jobTracker,
                cacheManager: (this as any).cacheManager,
                metrics: (this as any).metrics,
                circuitBreaker: (this as any).circuitBreaker,
                broker: this.broker,
              });
              (this as any).exportService.setModels(models);

              this.broker.createService({
                name: "export.worker",
                mixins: [ExportWorker],
                settings: {
                    logger: this.logger,
                    jobTracker: (this as any).jobTracker,
                    cacheService: ((this as any).exportService as any).exportCenter.cacheService,
                }
              });

              const concurrency = Number(SVC_ENV.get().MAX_CONCURRENT_EXPORTS || 3);
              if ((this as any).jobQueue) {
                (this as any).jobQueue
                  .process((job: any) => this.processExportJob(job), concurrency)
                  .catch((e: any) => this.logger.error("Lỗi worker:", e.message));
              }

              this.logger.info(`${ServiceName} khởi tạo thành công`);
            } catch (error: any) {
              this.logger.error("Kết nối DB thất bại:", error.message);
              throw new Error("Connect to database error, please check MONGO_URI at .run.env");
            }
        }
    },
    hooks: {
        before: { "*": [middlewares.trackingIn] },
        after: { "*": [middlewares.trackingOut] },
    },
    async created(this: Service) {
        this.logger.info(`${ServiceName} đã được tạo`);
        try {
            await SVC_ENV.setEnvironments(this.broker, ServiceName);
            await this.initService();
        } catch (error: any) {
            this.broker.logger.fatal("Khởi động service thất bại:", error.message);
            this.broker.destroyService(this);
        }
    },
    started() {
        (this as any).logger.info(`${(this as any).name} đã khởi động`);
    },
    stopped() {
        (this as any).logger.info(`${(this as any).name} đã dừng`);
    }
};

export default ExportServiceSchema;
