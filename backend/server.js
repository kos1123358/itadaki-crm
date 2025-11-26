const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const { Customer, CallHistory, Status } = require('./models');

const app = express();
const PORT = process.env.PORT || 5001;

// ミドルウェア
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://ffcdd2ae8e35.ngrok.app'
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ルート
const customersRouter = require('./routes/customers');
const callHistoriesRouter = require('./routes/callHistories');
const statusesRouter = require('./routes/statuses');

app.use('/api/customers', customersRouter);
app.use('/api/call-histories', callHistoriesRouter);
app.use('/api/statuses', statusesRouter);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CRM API is running' });
});

// データベース初期化とサーバー起動
const startServer = async () => {
  try {
    // データベース接続テスト
    await testConnection();

    // テーブル作成（開発環境のみ）
    await sequelize.sync();
    console.log('データベーステーブルを同期しました');

    // サーバー起動
    app.listen(PORT, () => {
      console.log(`サーバーがポート ${PORT} で起動しました`);
      console.log(`http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
};

startServer();
