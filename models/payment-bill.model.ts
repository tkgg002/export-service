import { DataTypes, Model, Op, Sequelize } from 'sequelize';

interface FilterOptions {
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  merchantId?: string;
  merchantEmail?: string;
  state?: string;
  channelID?: string;
  apiType?: string;
  orderId?: string;
  merchantTransId?: string;
  partnerCode?: string;
  trackingId?: string;
  lastUpdatedAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

class PaymentBillModel extends Model {
  static initModel(sequelize: Sequelize) {
    PaymentBillModel.init({
      id: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
      merchant_trans_id: { type: DataTypes.STRING(255) },
      order_id: { type: DataTypes.STRING(255) },
      amount: { type: DataTypes.DECIMAL(15,2), allowNull: false },
      paid_amount: { type: DataTypes.DECIMAL(15,2) },
      refunded_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
      currency: { type: DataTypes.STRING(10), defaultValue: 'VND' },
      state: { type: DataTypes.STRING(50), allowNull: false },
      api_type: { type: DataTypes.STRING(50) },
      channel_id: { type: DataTypes.STRING(50) },
      order_info: { type: DataTypes.TEXT },
      merchant_id: { type: DataTypes.STRING(50), allowNull: false },
      merchant_email: { type: DataTypes.STRING(255), allowNull: false },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
      sequelize,
      modelName: 'PaymentBill',
      tableName: 'payment_bills',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    return PaymentBillModel;
  }

  static async findWithPayments(filter: FilterOptions = {}, sort = { createdAt: -1 }, skip = 0, limit = 1000) {
    // Convert MongoDB-style filter to Sequelize where conditions
    const where: any = { is_delete: false };
    
    // Handle date range filters
    if (filter.createdAt && (filter.createdAt.$gte || filter.createdAt.$lte)) {
      where.created_at = {};
      if (filter.createdAt.$gte) where.created_at[Op.gte] = filter.createdAt.$gte;
      if (filter.createdAt.$lte) where.created_at[Op.lte] = filter.createdAt.$lte;
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

    // Handle updated date range filters
    if (filter.lastUpdatedAt && (filter.lastUpdatedAt.$gte || filter.lastUpdatedAt.$lte)) {
      where.updated_at = {};
      if (filter.lastUpdatedAt.$gte) where.updated_at[Op.gte] = filter.lastUpdatedAt.$gte;
      if (filter.lastUpdatedAt.$lte) where.updated_at[Op.lte] = filter.lastUpdatedAt.$lte;
    }

    return await PaymentBillModel.findAll({ where, offset: skip, limit, raw: true });
  }
}

export default PaymentBillModel;
