const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallHistory = sequelize.define('CallHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    },
    comment: '顧客ID'
  },
  call_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '架電日時'
  },
  call_type: {
    type: DataTypes.ENUM('発信', '着信', 'メール', 'その他'),
    allowNull: false,
    comment: '架電種別'
  },
  call_result: {
    type: DataTypes.ENUM('接続成功', '不在', '留守電', '拒否', 'その他'),
    comment: '架電結果'
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: '通話時間（秒）'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'メモ・内容'
  },
  next_action: {
    type: DataTypes.STRING,
    comment: '次回アクション'
  },
  next_contact_date: {
    type: DataTypes.DATE,
    comment: '次回連絡予定日'
  },
  staff_name: {
    type: DataTypes.STRING,
    comment: '担当者名'
  }
}, {
  tableName: 'call_histories',
  timestamps: true
});

module.exports = CallHistory;
