export function trackingIn(ctx) {
    ctx.meta.startTime = Date.now();
    if (ctx.action && !ctx.action.name.endsWith(".healthCheck")) {
        this.logger.info(`[${ctx.action.name}] REQUEST - ${JSON.stringify(ctx.params)}`);
    }
}
export function trackingOut(ctx, data) {
    if (ctx.action && !ctx.action.name.endsWith(".healthCheck")) {
        const duration = Date.now() - (ctx.meta.startTime || 0);
        this.logger.info(`[${ctx.action.name}] RESPONSE - Duration: ${duration}ms`);
    }
    return data;
}
//# sourceMappingURL=tracking.middleware.js.map