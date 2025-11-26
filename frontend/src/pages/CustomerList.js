import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      message.error('顧客データの取得に失敗しました');
      console.error('顧客取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (customer = null) => {
    setEditingCustomer(customer);
    if (customer) {
      form.setFieldsValue({
        ...customer,
        inflow_date: customer.inflow_date ? dayjs(customer.inflow_date) : null,
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        inflow_date: values.inflow_date ? values.inflow_date.toISOString() : null,
      };

      if (editingCustomer) {
        await customerAPI.update(editingCustomer.id, formattedValues);
        message.success('顧客情報を更新しました');
      } else {
        await customerAPI.create(formattedValues);
        message.success('顧客を登録しました');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      message.error('保存に失敗しました');
      console.error('保存エラー:', error);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '顧客を削除しますか？',
      content: 'この操作は取り消せません。',
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          await customerAPI.delete(id);
          message.success('顧客を削除しました');
          fetchCustomers();
        } catch (error) {
          message.error('削除に失敗しました');
          console.error('削除エラー:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'メール',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '電話番号',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (phone) => phone ? (
        <a href={`tel:${phone}`} style={{ color: '#1890ff' }}>
          {phone}
        </a>
      ) : '-',
    },
    {
      title: 'ステータス',
      dataIndex: ['statusInfo', 'current_status'],
      key: 'status',
    },
    {
      title: '流入日',
      dataIndex: 'inflow_date',
      key: 'inflow_date',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/customers/${record.id}`)}
          >
            詳細
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編集
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ margin: 0 }}>顧客管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新規登録
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingCustomer ? '顧客情報編集' : '新規顧客登録'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width="90%"
        style={{ maxWidth: 800 }}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名前" rules={[{ required: true, message: '名前を入力してください' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="furigana" label="ふりがな">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="メール" rules={[{ required: true, type: 'email', message: '有効なメールアドレスを入力してください' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone_number" label="電話番号">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="性別">
            <Select>
              <Option value="男性">男性</Option>
              <Option value="女性">女性</Option>
              <Option value="その他">その他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="age" label="年齢">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="media" label="媒体">
            <Input />
          </Form.Item>
          <Form.Item name="route" label="経路">
            <Input />
          </Form.Item>
          <Form.Item name="inflow_date" label="流入日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="address" label="住所">
            <Input />
          </Form.Item>
          <Form.Item name="current_company" label="現職">
            <Input />
          </Form.Item>
          <Form.Item name="current_job_type" label="現職種">
            <Input />
          </Form.Item>
          <Form.Item name="current_salary" label="現年収">
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="万円" />
          </Form.Item>
          <Form.Item name="desired_job_type" label="希望職種">
            <Input />
          </Form.Item>
          <Form.Item name="desired_industry" label="希望業種">
            <Input />
          </Form.Item>
          <Form.Item name="desired_salary" label="希望年収">
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="万円" />
          </Form.Item>
          <Form.Item name="desired_work_location" label="希望勤務地">
            <Input />
          </Form.Item>
          <Form.Item name="available_time" label="繋がりやすい時間帯">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerList;
