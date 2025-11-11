import MongoDBHandler from '../dbHandler/mongo.ts';
import { ServiceBroker } from 'moleculer';
import { Collection, Connection } from 'mongoose';

class PaymentBillsMongoDataAccess {
  private logger: ServiceBroker['logger'];
  private mongoHandler: MongoDBHandler;
  private mongoConnection: Connection | null;

  constructor(logger: ServiceBroker['logger']) {
    // Ensure logger has all required methods
    const fallback = console;
    const src = logger && typeof logger === 'object' ? logger : {};
    this.logger = {
      info: typeof src.info === 'function' ? src.info.bind(src) : fallback.info.bind(fallback),
      warn: typeof src.warn === 'function' ? src.warn.bind(src)
        : (typeof src.warning === 'function' ? (src.warning as any).bind(src) : fallback.warn.bind(fallback)),
      error: typeof src.error === 'function' ? src.error.bind(src) : fallback.error.bind(fallback),
    };
    this.mongoHandler = new MongoDBHandler(this.logger);
    this.mongoConnection = null;
  }

  async connect(): Promise<Connection> {
    if (!this.mongoConnection) {
        this.mongoConnection = await this.mongoHandler.connect();
    }
    return this.mongoConnection;
  }

  async find({ filter, sort, offset, limit }: { filter: any, sort: any, offset: number, limit: number }) {
    await this.connect();
    const collection: Collection = this.mongoConnection!.collection('payment-bills');

    this.logger.info(`MongoDB Query: ${JSON.stringify(filter)}`);
    this.logger.info(`Sort: ${JSON.stringify(sort || { createdAt: -1 })}`);
    this.logger.info(`Skip: ${offset || 0}, Limit: ${limit || 1000}`);

    // Convert MariaDB-style filters to MongoDB format
    const mongoFilter = this.convertFilterToMongo(filter);

    const documents = await collection
      .find(mongoFilter)
      .sort(sort || { createdAt: -1 })
      .skip(offset || 0)
      .limit(limit || 1000)
      .toArray();

    this.logger.info(`Found ${documents.length} MongoDB documents`);
    
    // Convert MongoDB documents to the expected export format
    return documents.map(doc => this.convertDocumentToExportFormat(doc));
  }

  async count(filter: any) {
    await this.connect();
    const collection = this.mongoConnection!.collection('payment-bills');
    
    // Convert MariaDB-style filters to MongoDB format
    const mongoFilter = this.convertFilterToMongo(filter);
    
    const count = await collection.countDocuments(mongoFilter);
    this.logger.info(`Counted ${count} MongoDB documents for filter ${JSON.stringify(mongoFilter)}`);
    return count;
  }

  async disconnect() {
    if (this.mongoHandler && typeof this.mongoHandler.disconnect === 'function') {
      await this.mongoHandler.disconnect();
    }
  }

  convertFilterToMongo(filter: any) {
    const mongoFilter: any = { isDelete: false };
    
    // Handle date range filters
    if (filter.createdAt && (filter.createdAt.$gte || filter.createdAt.$lte)) {
      mongoFilter.createdAt = {};
      if (filter.createdAt.$gte) mongoFilter.createdAt.$gte = filter.createdAt.$gte;
      if (filter.createdAt.$lte) mongoFilter.createdAt.$lte = filter.createdAt.$lte;
    }
    
    // Handle updated date range filters
    if (filter.lastUpdatedAt && (filter.lastUpdatedAt.$gte || filter.lastUpdatedAt.$lte)) {
      mongoFilter.lastUpdatedAt = {};
      if (filter.lastUpdatedAt.$gte) mongoFilter.lastUpdatedAt.$gte = filter.lastUpdatedAt.$gte;
      if (filter.lastUpdatedAt.$lte) mongoFilter.lastUpdatedAt.$lte = filter.lastUpdatedAt.$lte;
    }
    
    // Handle other field filters
    if (filter.merchantId) mongoFilter['merchantInfo.id'] = filter.merchantId;
    if (filter.merchantEmail) mongoFilter['merchantInfo.email'] = filter.merchantEmail;
    if (filter.state) mongoFilter.state = filter.state;
    if (filter.channelID) mongoFilter.channelID = filter.channelID;
    if (filter.apiType) mongoFilter.apiType = filter.apiType;
    if (filter.orderId) mongoFilter.orderId = filter.orderId;
    if (filter.merchantTransId) mongoFilter.merchantTransId = filter.merchantTransId;
    if (filter.partnerCode) mongoFilter.partnerCode = filter.partnerCode;
    if (filter.trackingId) mongoFilter.trackingId = filter.trackingId;

    return mongoFilter;
  }

  convertDocumentToExportFormat(doc: any) {
    return {
      id: doc._id,
      tracking_id: doc.trackingId,
      merchant_trans_id: doc.merchantTransId,
      state: doc.state,
      amount: doc.amount,
      paid_amount: doc.paidAmount,
      refunded_amount: doc.refundedAmount,
      order_info: doc.orderInfo,
      currency: doc.currency,
      merchant_id: doc.merchantInfo?.id,
      merchant_email: doc.merchantInfo?.email,
      merchant_name: doc.merchantInfo?.name,
      merchant_phone: doc.merchantInfo?.phone,
      channel_id: doc.channelID,
      api_type: doc.apiType,
      order_id: doc.orderId,
      partner_code: doc.partnerCode,
      payment_method: doc.paymentMethod?.join(', '),
      created_at: doc.createdAt,
      updated_at: doc.lastUpdatedAt,
      completed_at: doc.completedAt
    };
  }
}

export default PaymentBillsMongoDataAccess;
