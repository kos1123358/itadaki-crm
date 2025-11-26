const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// 顧客一覧取得
router.get('/', customerController.getAllCustomers);

// 顧客検索
router.get('/search', customerController.searchCustomers);

// 顧客詳細取得
router.get('/:id', customerController.getCustomerById);

// 顧客作成
router.post('/', customerController.createCustomer);

// 顧客更新
router.put('/:id', customerController.updateCustomer);

// 顧客削除
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
