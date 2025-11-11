import { DataTypes, Model, Sequelize } from 'sequelize';

class PaymentModel extends Model {
  static initModel(sequelize: Sequelize) {
    PaymentModel.init({
      id: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
      bill_id: { type: DataTypes.STRING(50), allowNull: false },
      amount: { type: DataTypes.DECIMAL(15,2) },
      channel_id: { type: DataTypes.STRING(50) },
      status: { type: DataTypes.STRING(50) }
    }, {
      sequelize,
      modelName: 'Payment',
      tableName: 'payments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false
    });
    return PaymentModel;
  }
}

export default PaymentModel;
