const Customer = require('./Customer');
const CallHistory = require('./CallHistory');
const Status = require('./Status');

// リレーションシップの定義
Customer.hasMany(CallHistory, {
  foreignKey: 'customer_id',
  as: 'callHistories'
});

CallHistory.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

Customer.hasOne(Status, {
  foreignKey: 'customer_id',
  as: 'statusInfo'
});

Status.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

module.exports = {
  Customer,
  CallHistory,
  Status
};
