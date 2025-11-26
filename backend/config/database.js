const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

// データベース接続テスト
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('データベース接続成功');
  } catch (error) {
    console.error('データベース接続エラー:', error);
  }
};

module.exports = { sequelize, testConnection };
