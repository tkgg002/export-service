import { ServiceBroker } from 'moleculer';

class WalletTransactionsMariaDataAccess {
  private logger: ServiceBroker['logger'];
  private models: any;

  constructor({ logger, models }: { logger: ServiceBroker['logger'], models: any }) {
    this.logger = logger;
    this.models = models;
  }

  async query({ filter, sort, skip, limit }: { filter: any, sort: any, skip: number, limit: number }) {
    try {
      const order = sort
        ? [[Object.keys(sort)[0], sort[Object.keys(sort)[0]] === -1 ? 'DESC' : 'ASC']]
        : [['created_at', 'DESC']];

      const result = await this.models?.TransHisModel?.findAll({
        where: filter,
        offset: skip || 0,
        limit: limit || 1000,
        raw: true,
        order
      });
      return result || [];
    } catch (error) {
      this.logger?.error(`WalletTransactionsMariaDataAccess query error: ${error}`);
      return [];
    }
  }
}

export default WalletTransactionsMariaDataAccess;
