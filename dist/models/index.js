import PaymentBillModel from './payment-bill.model.ts';
export const init = (sequelize, logger) => {
    const PaymentBill = PaymentBillModel.initModel(sequelize);
    return {
        PaymentBillModel: PaymentBill,
    };
};
//# sourceMappingURL=index.js.map