import { DataTypes, Model, Sequelize } from 'sequelize';

class TransHisModel extends Model {
  static initModel(sequelize: Sequelize) {
    TransHisModel.init({
      id: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
      trans_id: { type: DataTypes.STRING(100), allowNull: false },
      customer_id: { type: DataTypes.STRING(50), allowNull: false },
      customer_name: { type: DataTypes.STRING(255) },
      trans_type: { type: DataTypes.STRING(50), allowNull: false },
      amount: { type: DataTypes.DECIMAL(15,2), allowNull: false },
      balance_before: { type: DataTypes.DECIMAL(15,2) },
      balance_after: { type: DataTypes.DECIMAL(15,2) },
      status: { type: DataTypes.STRING(50), allowNull: false },
      description: { type: DataTypes.TEXT }
    }, {
      sequelize,
      modelName: 'TransHis',
      tableName: 'trans_his',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    return TransHisModel;
  }
}

export default TransHisModel;
