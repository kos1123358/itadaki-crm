const { Customer, Status } = require('../models');

// Webhook経由での顧客登録
exports.createCustomerViaWebhook = async (req, res) => {
  try {
    // API Key認証チェック
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.WEBHOOK_API_KEY || 'your-secret-api-key-here';

    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid API Key'
      });
    }

    // 必須フィールドのチェック
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: name and email are required fields'
      });
    }

    // メールアドレスの重複チェック
    const existingCustomer = await Customer.findOne({ where: { email } });
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: Customer with this email already exists',
        customer_id: existingCustomer.id
      });
    }

    // 顧客データの作成
    const customerData = {
      name: req.body.name,
      furigana: req.body.furigana || null,
      gender: req.body.gender || null,
      age: req.body.age || null,
      email: req.body.email,
      phone_number: req.body.phone_number || null,
      address: req.body.address || null,
      media: req.body.media || null,
      route: req.body.route || null,
      inflow_date: req.body.inflow_date || new Date(),
      current_company: req.body.current_company || null,
      current_job_type: req.body.current_job_type || null,
      current_salary: req.body.current_salary || null,
      desired_job_type: req.body.desired_job_type || null,
      desired_industry: req.body.desired_industry || null,
      desired_salary: req.body.desired_salary || null,
      desired_work_location: req.body.desired_work_location || null,
      available_time: req.body.available_time || null
    };

    const customer = await Customer.create(customerData);

    // 初期ステータスを作成
    const statusData = {
      customer_id: customer.id,
      current_status: req.body.initial_status || '新規登録',
      priority: req.body.priority || '中',
      assigned_staff: req.body.assigned_staff || null,
      notes: req.body.notes || null,
      status_updated_date: new Date()
    };

    await Status.create(statusData);

    // 作成された顧客情報を取得
    const createdCustomer = await Customer.findByPk(customer.id, {
      include: [{ model: Status, as: 'statusInfo' }]
    });

    // Webhook成功レスポンス
    res.status(201).json({
      success: true,
      message: 'Customer created successfully via webhook',
      data: {
        customer_id: createdCustomer.id,
        name: createdCustomer.name,
        email: createdCustomer.email,
        status: createdCustomer.statusInfo?.current_status,
        created_at: createdCustomer.created_at
      }
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
