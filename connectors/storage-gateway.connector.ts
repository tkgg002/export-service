import SVC_ENV from '../svc-env.ts';
import { Context } from 'moleculer';

export async function generateExcel(ctx: Context, payload: any): Promise<any> {
  const service = SVC_ENV.get().STORAGE_GATEWAY_SERVICE || 'storage-gateway';
  return ctx.call(`${service}.generateExcel`, payload, { meta: ctx.meta });
}
