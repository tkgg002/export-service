class ExportMetrics {
    metrics;
    window;
    constructor() {
        this.metrics = {
            totalExports: 0,
            successfulExports: 0,
            failedExports: 0,
            averageProcessingTimeMs: 0,
            throughputRps: 0,
            lastDurationMs: 0,
            lastUpdatedAt: 0,
        };
        this.window = { count: 0, start: Date.now() };
    }
    recordExport(durationMs, success, recordCount = 0) {
        this.metrics.totalExports++;
        if (success)
            this.metrics.successfulExports++;
        else
            this.metrics.failedExports++;
        this.metrics.averageProcessingTimeMs = this.metrics.averageProcessingTimeMs === 0
            ? durationMs
            : Math.round((this.metrics.averageProcessingTimeMs + durationMs) / 2);
        this.metrics.lastDurationMs = durationMs;
        this.metrics.lastUpdatedAt = Date.now();
        this.window.count++;
        const now = Date.now();
        const elapsedSec = (now - this.window.start) / 1000;
        if (elapsedSec >= 1) {
            this.metrics.throughputRps = +(this.window.count / elapsedSec).toFixed(2);
            this.window.count = 0;
            this.window.start = now;
        }
    }
    toJSON() { return this.metrics; }
}
export default ExportMetrics;
//# sourceMappingURL=metrics.js.map