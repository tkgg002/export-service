import { Op } from 'sequelize';
import { ServiceBroker } from 'moleculer';

class PaymentBillsMariaDataAccess {
  private logger: ServiceBroker['logger'];
  private models: any;
  private cache: any;

  constructor({ logger, models, cache }: { logger: ServiceBroker['logger'], models: any, cache: any }) {
    // Ensure logger has all required methods
    const fallback = console;
    const src = logger && typeof logger === 'object' ? logger : {};
    this.logger = {
      info: typeof src.info === 'function' ? src.info.bind(src) : fallback.info.bind(fallback),
      warn: typeof src.warn === 'function' ? src.warn.bind(src)
        : (typeof src.warning === 'function' ? (src.warning as any).bind(src) : fallback.warn.bind(fallback)),
      error: typeof src.error === 'function' ? src.error.bind(src) : fallback.error.bind(fallback),
    };
    this.models = models;
    this.cache = cache;
  }

  async find({ filter, sort, offset, limit }: { filter: any, sort: any, offset: number, limit: number }) {
    try {
      const cacheKey = { ns: 'payment:with-payments', filter, sort, skip: offset, limit };
      const cached = await this.cache?.get(cacheKey);
      if (cached) return cached;

      const result = await this.models?.PaymentBillModel?.findWithPayments(filter, sort, offset, limit);

      if (result && Array.isArray(result)) {
        await this.cache?.set(cacheKey, result);
      }
      return result || [];
    } catch (error) {
      this.logger?.error(`PaymentBillsMariaDataAccess find error: ${error}`);
      return [];
    }
  }

  async count(filter: any) {
    try {
      // Convert filter to Sequelize where conditions
      const where = this.convertFilterToWhere(filter);
      const count = await this.models?.PaymentBillModel?.count({ where });
      return count || 0;
    } catch (error) {
      this.logger?.error(`PaymentBillsMariaDataAccess count error: ${error}`);
      return 0;
    }
  }

  convertFilterToWhere(filter: any) {
    const where: any = { is_delete: false };
    
    // Handle date range filters
    if (filter.createdAt && (filter.createdAt.$gte || filter.createdAt.$lte)) {
      where.created_at = {};
      if (filter.createdAt.$gte) where.created_at[Op.gte] = filter.createdAt.$gte;
      if (filter.createdAt.$lte) where.created_at[Op.lte] = filter.createdAt.$lte;
    }
    
    // Handle updated date range filters
    if (filter.lastUpdatedAt && (filter.lastUpdatedAt.$gte || filter.lastUpdatedAt.$lte)) {
      where.updated_at = {};
      if (filter.lastUpdatedAt.$gte) where.updated_at[Op.gte] = filter.lastUpdatedAt.$gte;
      if (filter.lastUpdatedAt.$lte) where.updated_at[Op.lte] = filter.lastUpdatedAt.$lte;
    }
    
    // Handle other field filters
    if (filter.merchantId) where.merchant_id = filter.merchantId;
    if (filter.merchantEmail) where.merchant_email = filter.merchantEmail;
    if (filter.state) where.state = filter.state;
    if (filter.channelID) where.channel_id = filter.channelID;
    if (filter.apiType) where.api_type = filter.apiType;
    if (filter.orderId) where.order_id = filter.orderId;
    if (filter.merchantTransId) where.merchant_trans_id = filter.merchantTransId;
    if (filter.partnerCode) where.partner_code = filter.partnerCode;
    if (filter.trackingId) where.tracking_id = filter.trackingId;

    return where;
  }
}

export default PaymentBillsMariaDataAccess;
