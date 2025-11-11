import { Context, Service } from 'moleculer';

export function trackingIn(this: Service, ctx: Context) {
    (ctx.meta as any).startTime = Date.now();
    
    if (ctx.action && !ctx.action.name!.endsWith(".healthCheck")) {
        this.logger.info(`[${ctx.action.name}] REQUEST - ${JSON.stringify(ctx.params)}`);
    }
}

export function trackingOut(this: Service, ctx: Context, data: any) {
    if (ctx.action && !ctx.action.name!.endsWith(".healthCheck")) {
        const duration = Date.now() - ((ctx.meta as any).startTime || 0);
        this.logger.info(`[${ctx.action.name}] RESPONSE - Duration: ${duration}ms`);
    }
    
    return data;
}
