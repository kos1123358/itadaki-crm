const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook経由での顧客登録
router.post('/customer', webhookController.createCustomerViaWebhook);

module.exports = router;
