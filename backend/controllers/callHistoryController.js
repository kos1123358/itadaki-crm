const { CallHistory, Customer } = require('../models');

// 架電履歴一覧取得
exports.getAllCallHistories = async (req, res) => {
  try {
    const callHistories = await CallHistory.findAll({
      include: [{ model: Customer, as: 'customer' }],
      order: [['call_date', 'DESC']]
    });
    res.json(callHistories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 特定顧客の架電履歴取得
exports.getCallHistoriesByCustomer = async (req, res) => {
  try {
    const callHistories = await CallHistory.findAll({
      where: { customer_id: req.params.customerId },
      order: [['call_date', 'DESC']]
    });
    res.json(callHistories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 架電履歴作成
exports.createCallHistory = async (req, res) => {
  try {
    const callHistory = await CallHistory.create(req.body);
    const created = await CallHistory.findByPk(callHistory.id, {
      include: [{ model: Customer, as: 'customer' }]
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 架電履歴更新
exports.updateCallHistory = async (req, res) => {
  try {
    const callHistory = await CallHistory.findByPk(req.params.id);
    if (!callHistory) {
      return res.status(404).json({ error: '架電履歴が見つかりません' });
    }

    await callHistory.update(req.body);
    const updated = await CallHistory.findByPk(req.params.id, {
      include: [{ model: Customer, as: 'customer' }]
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 架電履歴削除
exports.deleteCallHistory = async (req, res) => {
  try {
    const callHistory = await CallHistory.findByPk(req.params.id);
    if (!callHistory) {
      return res.status(404).json({ error: '架電履歴が見つかりません' });
    }

    await callHistory.destroy();
    res.json({ message: '架電履歴を削除しました' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
