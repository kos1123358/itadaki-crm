const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'メール'
  },
  media: {
    type: DataTypes.STRING,
    comment: '媒体'
  },
  route: {
    type: DataTypes.STRING,
    comment: '経路'
  },
  inflow_date: {
    type: DataTypes.DATE,
    comment: '流入日'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '名前'
  },
  furigana: {
    type: DataTypes.STRING,
    comment: 'ふりがな'
  },
  gender: {
    type: DataTypes.ENUM('男性', '女性', 'その他'),
    comment: '性別'
  },
  age: {
    type: DataTypes.INTEGER,
    comment: '年齢'
  },
  address: {
    type: DataTypes.STRING,
    comment: 'アドレス'
  },
  phone_number: {
    type: DataTypes.STRING,
    comment: '番号'
  },
  company_experience_count: {
    type: DataTypes.INTEGER,
    comment: '経験社数'
  },
  current_salary: {
    type: DataTypes.INTEGER,
    comment: '現年収'
  },
  current_job_type: {
    type: DataTypes.STRING,
    comment: '現職種'
  },
  job_change_schedule: {
    type: DataTypes.STRING,
    comment: '転職予定'
  },
  job_change_status: {
    type: DataTypes.STRING,
    comment: '転職状況'
  },
  desired_salary: {
    type: DataTypes.INTEGER,
    comment: '希望年収'
  },
  desired_work_location: {
    type: DataTypes.STRING,
    comment: '希望勤務地'
  },
  desired_industry: {
    type: DataTypes.STRING,
    comment: '希望業種'
  },
  desired_job_type: {
    type: DataTypes.STRING,
    comment: '希望職種'
  },
  final_education: {
    type: DataTypes.STRING,
    comment: '最終学歴'
  },
  employment_start_period: {
    type: DataTypes.STRING,
    comment: '就業開始時期'
  },
  current_company: {
    type: DataTypes.STRING,
    comment: '現職'
  },
  drivers_license: {
    type: DataTypes.BOOLEAN,
    comment: '運転免許'
  },
  status: {
    type: DataTypes.STRING,
    comment: '状況'
  },
  available_time: {
    type: DataTypes.STRING,
    comment: '繋がりやすい時間帯'
  }
}, {
  tableName: 'customers',
  timestamps: true
});

module.exports = Customer;
