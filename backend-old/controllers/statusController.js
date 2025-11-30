const { Status, Customer } = require('../models');

// ステータス一覧取得
exports.getAllStatuses = async (req, res) => {
  try {
    const statuses = await Status.findAll({
      include: [{ model: Customer, as: 'customer' }],
      order: [['status_updated_date', 'DESC']]
    });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 特定顧客のステータス取得
exports.getStatusByCustomer = async (req, res) => {
  try {
    const status = await Status.findOne({
      where: { customer_id: req.params.customerId },
      include: [{ model: Customer, as: 'customer' }]
    });
    if (!status) {
      return res.status(404).json({ error: 'ステータスが見つかりません' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ステータス更新
exports.updateStatus = async (req, res) => {
  try {
    const status = await Status.findOne({
      where: { customer_id: req.params.customerId }
    });

    if (!status) {
      return res.status(404).json({ error: 'ステータスが見つかりません' });
    }

    // ステータス更新時に更新日も自動更新
    const updateData = {
      ...req.body,
      status_updated_date: new Date()
    };

    await status.update(updateData);

    const updated = await Status.findOne({
      where: { customer_id: req.params.customerId },
      include: [{ model: Customer, as: 'customer' }]
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ステータス別の顧客数取得（ダッシュボード用）
exports.getStatusSummary = async (req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const summary = await Status.findAll({
      attributes: [
        'current_status',
        [Sequelize.fn('COUNT', Sequelize.col('current_status')), 'count']
      ],
      group: ['current_status']
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
