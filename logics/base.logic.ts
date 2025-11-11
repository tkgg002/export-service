import SVC_ENV from '../svc-env.ts';
import { ServiceBroker } from 'moleculer';

class BaseLogic {
  protected logger: ServiceBroker['logger'];
  protected dbMain: any;
  protected models: any;

  constructor({ logger, dbMain, models }: { logger: ServiceBroker['logger'], dbMain: any, models: any }) {
    this.logger = logger;
    this.dbMain = dbMain;
    this.models = models;
    
    // Validate read-only operations
    this.validateReadOnly();
  }

  formatDate(date: string | Date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().replace('T',' ').substring(0,19);
  }

  formatCurrency(amount: number | string) {
    const v = Number(amount||0);
    return new Intl.NumberFormat('vi-VN').format(v);
  }
  validateReadOnly() {
    // Override Sequelize query method to prevent writes
    const originalQuery = this.dbMain.query.bind(this.dbMain);
    this.dbMain.query = async (sql: string, options: any) => {
      // Check if SQL starts with write operations (more reliable)
      const writePrefixes = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
      const upperSQL = sql.toUpperCase().trim();
      
      for (const prefix of writePrefixes) {
        if (upperSQL.startsWith(prefix)) {
          this.logger.error(`🚫 Write operation blocked. Prefix: ${prefix}, SQL: ${sql}`);
          const error = new Error(`🚫 Write operation not allowed in export service: ${prefix}`);
          throw error;
        }
      }
      
      // Log read operations for audit
      if (SVC_ENV.get().NODE_ENV === 'development') {
        this.logger.debug(`📖 DB Read Query: ${sql.substring(0, 100)}...`);
      }
      
      return await originalQuery(sql, options);
    };

    // Override Model methods to prevent writes
    if (this.models) {
      Object.keys(this.models).forEach(modelName => {
        const model = this.models[modelName];
        if (model && typeof model === 'object') {
          
          // Override save method
          if (model.save) {
            model.save = (...args: any[]) => {
              throw new Error(`🚫 Model save not allowed in export service: ${modelName}`);
            };
          }
          
          // Override destroy method
          if (model.destroy) {
            model.destroy = (...args: any[]) => {
              throw new Error(`🚫 Model destroy not allowed in export service: ${modelName}`);
            };
          }
          
          // Override update method
          if (model.update) {
            model.update = (...args: any[]) => {
              throw new Error(`🚫 Model update not allowed in export service: ${modelName}`);
            };
          }
        }
      });
    }
  }
}

export default BaseLogic;
