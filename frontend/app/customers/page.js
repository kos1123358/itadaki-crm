'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Card, Tag, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PhoneOutlined, MailOutlined, UserOutlined, PhoneFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { customerAPI } from '@/lib/api';
import dayjs from 'dayjs';

const { Option } = Select;

// カスタムフック：画面サイズ検出
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

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
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<PhoneFilled />}
            onClick={() => router.push(`/call-work?customerId=${record.id}`)}
            style={{ color: '#52c41a' }}
          >
            架電
          </Button>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/customers/${record.id}`)}
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

  // モバイル用カードコンポーネント
  const CustomerCard = ({ customer }) => (
    <Card
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            <UserOutlined style={{ marginRight: 8 }} />
            {customer.name}
          </h3>
          {customer.statusInfo?.current_status && (
            <Tag color="blue" style={{ marginTop: 8 }}>
              {customer.statusInfo.current_status}
            </Tag>
          )}
        </div>
        <span style={{ color: '#999', fontSize: 12 }}>ID: {customer.id}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        {customer.phone_number && (
          <div style={{ marginBottom: 8 }}>
            <PhoneOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <a href={`tel:${customer.phone_number}`} style={{ color: '#1890ff', fontSize: 16 }}>
              {customer.phone_number}
            </a>
          </div>
        )}
        {customer.email && (
          <div style={{ marginBottom: 8 }}>
            <MailOutlined style={{ marginRight: 8, color: '#999' }} />
            <span style={{ fontSize: 14, color: '#666' }}>{customer.email}</span>
          </div>
        )}
        {customer.inflow_date && (
          <div style={{ fontSize: 13, color: '#999' }}>
            流入日: {dayjs(customer.inflow_date).format('YYYY-MM-DD')}
          </div>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Space size="small" style={{ width: '100%', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<PhoneFilled />}
          onClick={() => router.push(`/call-work?customerId=${customer.id}`)}
          size="large"
          style={{ minWidth: 80, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          架電
        </Button>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/customers/${customer.id}`)}
          size="large"
          style={{ minWidth: 80 }}
        >
          詳細
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => showModal(customer)}
          size="large"
          style={{ minWidth: 80 }}
        >
          編集
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(customer.id)}
          size="large"
          style={{ minWidth: 80 }}
        >
          削除
        </Button>
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>顧客管理</h1>
        <Space wrap>
          <Button
            type="primary"
            icon={<PhoneFilled />}
            onClick={() => router.push('/call-work')}
            size={isMobile ? 'large' : 'middle'}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            架電業務へ
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
            size={isMobile ? 'large' : 'middle'}
          >
            新規登録
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <div style={{ margin: '0 -8px' }}>
          {loading ? (
            <Card loading={true} />
          ) : customers.length > 0 ? (
            customers.map(customer => (
              <CustomerCard key={customer.id} customer={customer} />
            ))
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                顧客データがありません
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 30,
            showSizeChanger: true,
            pageSizeOptions: ['10', '30', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
          scroll={{ x: 1200 }}
        />
      )}

      {isModalVisible && (
        <Modal
          title={editingCustomer ? '顧客情報編集' : '新規顧客登録'}
          open={true}
          onOk={handleOk}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          width="90%"
          style={{ maxWidth: 800, top: isMobile ? 20 : undefined }}
          okText="保存"
          cancelText="キャンセル"
          okButtonProps={{ size: isMobile ? 'large' : 'middle' }}
          cancelButtonProps={{ size: isMobile ? 'large' : 'middle' }}
        >
        <Form form={form} layout="vertical">
          <Divider titlePlacement="left" style={{ fontSize: 16, fontWeight: 600 }}>基本情報</Divider>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="名前" rules={[{ required: true, message: '名前を入力してください' }]}>
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="furigana" label="ふりがな">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="メール" rules={[{ required: true, type: 'email', message: '有効なメールアドレスを入力してください' }]}>
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone_number" label="電話番号">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={8}>
              <Form.Item name="gender" label="性別">
                <Select size={isMobile ? 'large' : 'middle'}>
                  <Option value="男性">男性</Option>
                  <Option value="女性">女性</Option>
                  <Option value="その他">その他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="age" label="年齢">
                <InputNumber min={0} max={100} style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="inflow_date" label="流入日">
                <DatePicker style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="media" label="媒体">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="route" label="経路">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="住所">
            <Input size={isMobile ? 'large' : 'middle'} />
          </Form.Item>

          <Divider titlePlacement="left" style={{ fontSize: 16, fontWeight: 600 }}>職務情報</Divider>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="current_company" label="現職">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="current_job_type" label="現職種">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="current_salary" label="現年収">
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={0} style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
              <Input style={{ width: 'auto', pointerEvents: 'none' }} value="万円" readOnly />
            </Space.Compact>
          </Form.Item>

          <Divider titlePlacement="left" style={{ fontSize: 16, fontWeight: 600 }}>希望条件</Divider>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="desired_job_type" label="希望職種">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="desired_industry" label="希望業種">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="desired_salary" label="希望年収">
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber min={0} style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
                  <Input style={{ width: 'auto', pointerEvents: 'none' }} value="万円" readOnly />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="desired_work_location" label="希望勤務地">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="available_time" label="繋がりやすい時間帯">
            <Input size={isMobile ? 'large' : 'middle'} />
          </Form.Item>
        </Form>
        </Modal>
      )}
    </div>
  );
}
