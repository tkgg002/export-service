import crypto from 'crypto';
import { Errors, Context } from 'moleculer';
import SVC_ENV from '../svc-env.ts';

function getSignatureFromMeta(meta: any = {}) {
  const headers = meta.headers || {};
  return meta.signature || headers['x-signature'] || headers['X-Signature'] || meta['x-signature'] || null;
}

function getRawPayload(ctx: Context) {
  // Prefer a raw body if gateway forwarded it; fallback to params
  return ctx.meta && ctx.meta.rawBody
    ? (typeof ctx.meta.rawBody === 'string' ? ctx.meta.rawBody : JSON.stringify(ctx.meta.rawBody))
    : JSON.stringify(ctx.params || {});
}

function constantTimeEqual(a: string, b: string) {
  if (a == null || b == null) {
    return false;
  }
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function signatureGuard(ctx: Context) {
  const secret = SVC_ENV.get().SIGNATURE_SECRET_KEY || process.env.SIGNATURE_SECRET_KEY;
  // Allow disabling when secret not set
  if (!secret) return ctx;

  // Skip health check
  if (ctx.action && ctx.action.name && ctx.action.name.endsWith('.healthCheck')) return ctx;

  const receivedSig = getSignatureFromMeta(ctx.meta || {});
  if (!receivedSig) {
    throw new Errors.MoleculerError('Missing signature', 403, 'SIGNATURE_REQUIRED');
  }

  const raw = getRawPayload(ctx);
  const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!constantTimeEqual(receivedSig, computed)) {
    throw new Errors.MoleculerError('Invalid signature', 403, 'SIGNATURE_INVALID');
  }

  return ctx;
}

export { signatureGuard };
