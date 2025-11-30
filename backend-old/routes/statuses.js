const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// ステータス一覧取得
router.get('/', statusController.getAllStatuses);

// ステータスサマリー取得（ダッシュボード用）
router.get('/summary', statusController.getStatusSummary);

// 特定顧客のステータス取得
router.get('/customer/:customerId', statusController.getStatusByCustomer);

// ステータス更新
router.put('/customer/:customerId', statusController.updateStatus);

module.exports = router;
