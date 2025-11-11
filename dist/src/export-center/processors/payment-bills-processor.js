import BaseProcessor from './BaseProcessor.js';
class PaymentBillsProcessor extends BaseProcessor {
    constructor(options) {
        super(options);
    }
    buildFilter(params) {
        const filter = {};
        if ('merchantId' in params) {
            filter.merchantId = params.merchantId;
        }
        if ('channelID' in params) {
            filter.channelID = params.channelID;
        }
        if ('merchantEmail' in params) {
            filter.merchantEmail = params.merchantEmail;
        }
        if ('apiType' in params) {
            filter.apiType = params.apiType;
        }
        if ('state' in params) {
            filter.state = params.state;
        }
        if ('partnerCode' in params) {
            filter.partnerCode = params.partnerCode;
        }
        if ('orderId' in params) {
            filter.orderId = params.orderId;
        }
        if ('trackingId' in params) {
            filter.trackingId = params.trackingId;
        }
        if ('dateFr' in params || 'dateTo' in params) {
            filter.createdAt = {};
        }
        if ('dateFr' in params) {
            filter.createdAt.$gte = new Date(params.dateFr);
        }
        if ('dateTo' in params) {
            filter.createdAt.$lte = new Date(params.dateTo);
        }
        if ('updatedFr' in params || 'updatedTo' in params) {
            filter.lastUpdatedAt = {};
        }
        if ('updatedFr' in params) {
            filter.lastUpdatedAt.$gte = new Date(params.updatedFr);
        }
        if ('updatedTo' in params) {
            filter.lastUpdatedAt.$lte = new Date(params.updatedTo);
        }
        if ('merchantTransId' in params) {
            filter.merchantTransId = params.merchantTransId;
        }
        filter.isDelete = false;
        return filter;
    }
}
export default PaymentBillsProcessor;
//# sourceMappingURL=payment-bills-processor.js.map