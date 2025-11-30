const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Status = sequelize.define('Status', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'customers',
      key: 'id'
    },
    comment: '顧客ID'
  },
  current_status: {
    type: DataTypes.ENUM(
      '新規登録',
      '初回コンタクト待ち',
      '初回面談済み',
      '求人紹介中',
      '応募準備中',
      '書類選考中',
      '面接調整中',
      '一次面接済み',
      '二次面接済み',
      '最終面接済み',
      '内定',
      '入社決定',
      '保留中',
      '辞退',
      '不採用',
      '休眠'
    ),
    allowNull: false,
    defaultValue: '新規登録',
    comment: '現在のステータス'
  },
  status_updated_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'ステータス更新日'
  },
  assigned_staff: {
    type: DataTypes.STRING,
    comment: '担当者'
  },
  priority: {
    type: DataTypes.ENUM('低', '中', '高', '最優先'),
    defaultValue: '中',
    comment: '優先度'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: '備考'
  },
  last_contact_date: {
    type: DataTypes.DATE,
    comment: '最終連絡日'
  }
}, {
  tableName: 'statuses',
  timestamps: true
});

module.exports = Status;
