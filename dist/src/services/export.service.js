import { Context } from "moleculer";
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
            async handler() {
                const checks = { db: { status: "unknown" }, storage: { status: "unknown" } };
                try {
                    if (this.dbMain) {
                        const start = Date.now();
                        await this.dbMain.authenticate();
                        checks.db = { status: "healthy", latency: Date.now() - start };
                    }
                    else {
                        checks.db = { status: "uninitialized" };
                    }
                }
                catch (e) {
                    checks.db = { status: "unhealthy", error: e.message };
                }
                try {
                    const service = SVC_ENV.get().STORAGE_GATEWAY_SERVICE || "storage-gateway";
                    const start = Date.now();
                    await this.broker.call(`${service}.ping`);
                    checks.storage = { status: "healthy", latency: Date.now() - start };
                }
                catch (e) {
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
            async handler(ctx) { return this.handleExportAction(ctx, "payment-bills"); },
        },
        exportListTransHis: {
            params: {
                enableJobTracking: { type: "boolean", default: false, convert: true },
                jobId: { type: "string", optional: true },
            },
            async handler(ctx) { return this.handleExportAction(ctx, "wallet-transactions"); },
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
            async handler(ctx) { return this.handleExportAction(ctx, ctx.params.exportType); },
        },
        getMetrics: {
            desc: "Lấy metrics của service",
            async handler() { return this.metrics?.toJSON() || {}; },
        },
        getJobStatus: {
            desc: "Lấy trạng thái job",
            params: { jobId: { type: "string" } },
            async handler(ctx) {
                const data = await this.jobTracker.getStatus(ctx.params.jobId);
                return { jobId: ctx.params.jobId, ...data };
            },
        },
        listExports: {
            desc: "Liệt kê tất cả loại export",
            async handler() { return this.exportService.listExports(); },
        },
    },
    methods: {
        async handleExportAction(ctx, exportType) {
            if (!exportType)
                throw new Error("exportType is required");
            const enableJobTracking = this.normalizeBool(ctx.params.enableJobTracking);
            this.logger.info(`[handleExportAction] type=${exportType}, enableJobTracking=${enableJobTracking}`);
            ctx.params.exportType = exportType;
            ctx.params.enableJobTracking = enableJobTracking;
            if (enableJobTracking) {
                const jobId = ctx.params.jobId || uuidv4();
                await this.jobTracker.setStatus(jobId, {
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
                await this.jobQueue.enqueue(job);
                this.logger.info(`[handleExportAction] Job queued: ${jobId}`);
                return { jobId, status: "queued" };
            }
            return await this.exportService.exportData(ctx);
        },
        async processExportJob(job) {
            const { id, type, params } = job;
            const timeout = setTimeout(() => {
                this.logger.error(`Job timed out: ${id}`);
            }, JOB_TIMEOUT_MS);
            try {
                await this.jobTracker.setStatus(id, { status: "processing", percentage: 0 });
                const onProgress = async (percentage, processed = 0, total = 0) => {
                    try {
                        await this.jobTracker.setStatus(id, {
                            status: "processing",
                            percentage,
                            processedRecords: processed,
                            totalRecords: total,
                        });
                    }
                    catch (err) {
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
                const result = await this.exportService.exportData(ctx, onProgress);
                await this.jobTracker.setStatus(id, {
                    status: "completed",
                    percentage: 100,
                    fileName: result?.fileName || "",
                    url: result?.url || "",
                    totalRecords: result?.totalRecords || 0,
                    completedAt: Date.now(),
                });
                this.logger.info(`Job hoàn thành: ${id}`);
                return result;
            }
            catch (error) {
                await this.jobTracker.setStatus(id, {
                    status: "failed",
                    error: error.message,
                    failedAt: Date.now(),
                });
                this.logger.error(`Job thất bại [${id}]:`, error.message);
                throw error;
            }
            finally {
                clearTimeout(timeout);
            }
        },
        normalizeBool(v) {
            if (typeof v === "boolean")
                return v;
            if (v == null)
                return false;
            const s = String(v).toLowerCase();
            return ["true", "1", "on", "yes"].includes(s);
        },
        async initService() {
            const dbHandler = new MongoDb(this.logger);
            try {
                const dbConnection = await dbHandler.connect();
                if (!dbConnection) {
                    throw new Error("Connect to database error, please check MONGO_URI at .run.env");
                }
                const models = modelsIndex.init(dbConnection, this.logger);
                this.dbMain = dbConnection;
                this.cacheManager = new CacheManager(this.logger);
                this.metrics = new ExportMetrics();
                try {
                    await this.cacheManager.connect();
                    this.logger.info("Cache kết nối thành công");
                }
                catch (e) {
                    this.logger.warn("Cache không khả dụng:", e.message);
                }
                this.circuitBreaker = new CircuitBreaker({
                    failureThreshold: Number(SVC_ENV.get().CB_FAILURE_THRESHOLD || 10),
                    recoveryTimeout: Number(SVC_ENV.get().CB_RECOVERY_TIMEOUT || 300000),
                    logger: this.logger,
                });
                this.jobQueue = new JobQueue(this.logger);
                this.jobTracker = new JobTracker(this.logger);
                try {
                    await Promise.all([this.jobQueue.connect(), this.jobTracker.connect()]);
                    this.logger.info("Redis (Queue & Tracker) kết nối thành công");
                }
                catch (e) {
                    this.logger.warn("Redis không khả dụng:", e.message);
                }
                this.exportService = new MainExportService({
                    logger: this.logger,
                    db: dbConnection,
                    redisClient: this.jobTracker?.client || null,
                    jobTracker: this.jobTracker,
                    cacheManager: this.cacheManager,
                    metrics: this.metrics,
                    circuitBreaker: this.circuitBreaker,
                    broker: this.broker,
                });
                this.exportService.setModels(models);
                this.broker.createService({
                    name: "export.worker",
                    mixins: [ExportWorker],
                    settings: {
                        logger: this.logger,
                        jobTracker: this.jobTracker,
                        cacheService: this.exportService.exportCenter.cacheService,
                    }
                });
                const concurrency = Number(SVC_ENV.get().MAX_CONCURRENT_EXPORTS || 3);
                if (this.jobQueue) {
                    this.jobQueue
                        .process((job) => this.processExportJob(job), concurrency)
                        .catch((e) => this.logger.error("Lỗi worker:", e.message));
                }
                this.logger.info(`${ServiceName} khởi tạo thành công`);
            }
            catch (error) {
                this.logger.error("Kết nối DB thất bại:", error.message);
                throw new Error("Connect to database error, please check MONGO_URI at .run.env");
            }
        }
    },
    hooks: {
        before: { "*": [middlewares.trackingIn] },
        after: { "*": [middlewares.trackingOut] },
    },
    async created() {
        this.logger.info(`${ServiceName} đã được tạo`);
        try {
            await SVC_ENV.setEnvironments(this.broker, ServiceName);
            await this.initService();
        }
        catch (error) {
            this.broker.logger.fatal("Khởi động service thất bại:", error.message);
            this.broker.destroyService(this);
        }
    },
    started() {
        this.logger.info(`${this.name} đã khởi động`);
    },
    stopped() {
        this.logger.info(`${this.name} đã dừng`);
    }
};
export default ExportServiceSchema;
//# sourceMappingURL=export.service.js.map