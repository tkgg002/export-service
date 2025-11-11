import PaymentBillModel from './payment-bill.model.ts';
import type { Sequelize } from 'sequelize';
import type { ServiceBroker } from 'moleculer';

export const init = (sequelize: Sequelize, logger: ServiceBroker['logger']) => {
  const PaymentBill = PaymentBillModel.initModel(sequelize);
  // const Payment = PaymentModel.initModel(sequelize, logger);
  // const TransHis = TransHisModel.initModel(sequelize, logger);
  return { 
    PaymentBillModel: PaymentBill, 
    // PaymentModel: Payment, TransHisModel: TransHis 
    };
};
