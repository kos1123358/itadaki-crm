const { Customer, Status, CallHistory } = require('../models');

// 顧客一覧取得
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [
        { model: Status, as: 'statusInfo' },
        { model: CallHistory, as: 'callHistories', limit: 5, order: [['call_date', 'DESC']] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 顧客詳細取得
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        { model: Status, as: 'statusInfo' },
        { model: CallHistory, as: 'callHistories', order: [['call_date', 'DESC']] }
      ]
    });
    if (!customer) {
      return res.status(404).json({ error: '顧客が見つかりません' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 顧客作成
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    // 初期ステータスを作成
    await Status.create({
      customer_id: customer.id,
      current_status: '新規登録',
      status_updated_date: new Date()
    });

    const createdCustomer = await Customer.findByPk(customer.id, {
      include: [{ model: Status, as: 'statusInfo' }]
    });

    res.status(201).json(createdCustomer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 顧客更新
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '顧客が見つかりません' });
    }

    await customer.update(req.body);

    const updatedCustomer = await Customer.findByPk(req.params.id, {
      include: [
        { model: Status, as: 'statusInfo' },
        { model: CallHistory, as: 'callHistories' }
      ]
    });

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 顧客削除
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '顧客が見つかりません' });
    }

    await customer.destroy();
    res.json({ message: '顧客を削除しました' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 検索機能
exports.searchCustomers = async (req, res) => {
  try {
    const { name, email, phone, status } = req.query;
    const where = {};

    if (name) where.name = { [require('sequelize').Op.like]: `%${name}%` };
    if (email) where.email = { [require('sequelize').Op.like]: `%${email}%` };
    if (phone) where.phone_number = { [require('sequelize').Op.like]: `%${phone}%` };

    const customers = await Customer.findAll({
      where,
      include: [
        {
          model: Status,
          as: 'statusInfo',
          ...(status && { where: { current_status: status } })
        }
      ]
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
