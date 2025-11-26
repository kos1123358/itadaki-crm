const express = require('express');
const router = express.Router();
const callHistoryController = require('../controllers/callHistoryController');

// 架電履歴一覧取得
router.get('/', callHistoryController.getAllCallHistories);

// 特定顧客の架電履歴取得
router.get('/customer/:customerId', callHistoryController.getCallHistoriesByCustomer);

// 架電履歴作成
router.post('/', callHistoryController.createCallHistory);

// 架電履歴更新
router.put('/:id', callHistoryController.updateCallHistory);

// 架電履歴削除
router.delete('/:id', callHistoryController.deleteCallHistory);

module.exports = router;
