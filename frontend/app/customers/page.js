'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Card, Tag, Row, Col, Divider, Collapse, notification } from 'antd';
import { PlusOutlined, EditOutlined, PhoneOutlined, MailOutlined, UserOutlined, PhoneFilled, SearchOutlined, FilterOutlined, ClearOutlined, BellOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { customerAPI, statusAPI } from '@/lib/api';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

// ステータス選択肢
const STATUS_OPTIONS = [
  '未接触',
  '接触中',
  '面談設定済',
  '面談済',
  '求人提案中',
  '応募承諾',
  '選考中',
  '内定',
  '入社決定',
  '保留',
  '断念',
];

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

  // フィルター状態
  const [filters, setFilters] = useState({
    searchText: '',
    status: [],
    media: [],
    dateRange: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  // 媒体の選択肢を動的に取得
  const mediaOptions = useMemo(() => {
    const mediaSet = new Set(customers.map(c => c.media).filter(Boolean));
    return Array.from(mediaSet).sort();
  }, [customers]);

  // 緊急対応が必要な顧客かどうか判定（流入24時間以内 かつ 架電記録なし）
  const isUrgentCustomer = useCallback((customer) => {
    if (!customer.inflow_date) return false;
    const inflowTime = dayjs(customer.inflow_date);
    const now = dayjs();
    const hoursElapsed = now.diff(inflowTime, 'hour');
    const hasNoCallHistory = !customer.callHistories || customer.callHistories.length === 0;
    return hoursElapsed <= 24 && hasNoCallHistory;
  }, []);

  // フィルタリングされた顧客リスト
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // テキスト検索（名前、メール、電話番号）
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const nameMatch = customer.name?.toLowerCase().includes(searchLower);
        const emailMatch = customer.email?.toLowerCase().includes(searchLower);
        const phoneMatch = customer.phone_number?.includes(filters.searchText);
        const furiganaMatch = customer.furigana?.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch && !phoneMatch && !furiganaMatch) {
          return false;
        }
      }

      // ステータスフィルター
      if (filters.status.length > 0) {
        const customerStatus = customer.statusInfo?.current_status;
        if (!customerStatus || !filters.status.includes(customerStatus)) {
          return false;
        }
      }

      // 媒体フィルター
      if (filters.media.length > 0) {
        if (!customer.media || !filters.media.includes(customer.media)) {
          return false;
        }
      }

      // 日付範囲フィルター
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        const customerDate = customer.inflow_date ? dayjs(customer.inflow_date) : null;
        if (!customerDate) return false;
        const startDate = filters.dateRange[0].startOf('day');
        const endDate = filters.dateRange[1].endOf('day');
        if (customerDate.isBefore(startDate) || customerDate.isAfter(endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [customers, filters]);

  // フィルターをクリア
  const clearFilters = () => {
    setFilters({
      searchText: '',
      status: [],
      media: [],
      dateRange: null,
    });
  };

  // フィルターが適用されているかチェック
  const hasActiveFilters = filters.searchText || filters.status.length > 0 || filters.media.length > 0 || filters.dateRange;

  useEffect(() => {
    fetchCustomers();
  }, []);

  // リアルタイム購読のコールバック
  const handleRealtimeInsert = useCallback((newCustomer) => {
    notification.info({
      message: '新規顧客登録',
      description: `${newCustomer.name || newCustomer.email} が登録されました`,
      icon: <BellOutlined style={{ color: '#1890ff' }} />,
      duration: 5,
    });
    // 新しい顧客をリストの先頭に追加（ステータス情報なしで仮追加）
    setCustomers(prev => {
      // 既に存在する場合は追加しない
      if (prev.some(c => c.id === newCustomer.id)) return prev;
      return [{ ...newCustomer, statusInfo: null, callHistories: [] }, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((updatedCustomer) => {
    setCustomers(prev =>
      prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c)
    );
  }, []);

  const handleRealtimeDelete = useCallback((deletedCustomer) => {
    setCustomers(prev => prev.filter(c => c.id !== deletedCustomer.id));
  }, []);

  // Supabase Realtime購読 - customersテーブル
  useRealtimeSubscription('customers', {
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  // ステータス変更時のコールバック
  const handleStatusUpdate = useCallback((updatedStatus) => {
    console.log('[Realtime] Status updated:', updatedStatus);
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === updatedStatus.customer_id) {
          return {
            ...c,
            statusInfo: {
              ...c.statusInfo,
              current_status: updatedStatus.current_status,
              priority: updatedStatus.priority,
              status_updated_date: updatedStatus.status_updated_date,
            }
          };
        }
        return c;
      })
    );
  }, []);

  // Supabase Realtime購読 - statusesテーブル
  useRealtimeSubscription('statuses', {
    onInsert: handleStatusUpdate,
    onUpdate: handleStatusUpdate,
  });

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
        current_status: customer.statusInfo?.current_status || null,
        priority: customer.statusInfo?.priority || '中',
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // ステータス関連のフィールドを分離
      const { current_status, priority, ...customerValues } = values;

      const formattedValues = {
        ...customerValues,
        inflow_date: customerValues.inflow_date ? customerValues.inflow_date.toISOString() : null,
      };

      if (editingCustomer) {
        await customerAPI.update(editingCustomer.id, formattedValues);

        // ステータスが変更された場合は更新
        if (current_status) {
          await statusAPI.update(editingCustomer.id, {
            current_status,
            priority: priority || '中',
          });
        }

        message.success('顧客情報を更新しました');
      } else {
        const newCustomer = await customerAPI.create(formattedValues);

        // 新規登録時にステータスが指定されていれば更新
        if (current_status && current_status !== '未接触') {
          await statusAPI.update(newCustomer.data.id, {
            current_status,
            priority: priority || '中',
          });
        }

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

  const columns = [
    {
      title: '',
      key: 'actions',
      width: 80,
      fixed: 'left',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<PhoneFilled style={{ color: '#52c41a', fontSize: 18 }} />}
            onClick={() => router.push(`/call-work?customerId=${record.id}`)}
            title="架電"
          />
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#1890ff', fontSize: 18 }} />}
            onClick={() => showModal(record)}
            title="編集"
          />
        </Space>
      ),
    },
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ja'),
      render: (name, record) => (
        <Space>
          <a
            onClick={() => router.push(`/customers/${record.id}`)}
            style={{ color: '#1890ff', cursor: 'pointer' }}
          >
            {name}
          </a>
          {isUrgentCustomer(record) && <Tag color="red">要対応</Tag>}
        </Space>
      ),
    },
    {
      title: '架電数',
      dataIndex: 'callHistories',
      key: 'callCount',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.callHistories?.length || 0) - (b.callHistories?.length || 0),
      render: (callHistories) => {
        const count = callHistories?.length || 0;
        return (
          <Tag color={count === 0 ? 'default' : count < 3 ? 'blue' : 'green'}>
            {count}回
          </Tag>
        );
      },
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
      title: '媒体',
      dataIndex: 'media',
      key: 'media',
      sorter: (a, b) => (a.media || '').localeCompare(b.media || '', 'ja'),
      render: (media) => media || '-',
    },
    {
      title: 'ステータス',
      dataIndex: ['statusInfo', 'current_status'],
      key: 'status',
      sorter: (a, b) => (a.statusInfo?.current_status || '').localeCompare(b.statusInfo?.current_status || '', 'ja'),
      render: (status) => status ? (
        <Tag color={
          status === '内定' || status === '入社' ? 'green' :
          status === '辞退' || status === '不通' ? 'red' :
          status === '面談調整中' || status === '選考中' ? 'blue' :
          status === '新規登録' || status === '未接触' ? 'orange' :
          'default'
        }>
          {status}
        </Tag>
      ) : '-',
    },
    {
      title: '流入日',
      dataIndex: 'inflow_date',
      key: 'inflow_date',
      sorter: (a, b) => {
        const dateA = a.inflow_date ? new Date(a.inflow_date).getTime() : 0;
        const dateB = b.inflow_date ? new Date(b.inflow_date).getTime() : 0;
        return dateA - dateB;
      },
      defaultSortOrder: 'descend',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  // モバイル用カードコンポーネント
  const CustomerCard = ({ customer }) => {
    const urgent = isUrgentCustomer(customer);
    return (
      <Card
        style={{
          marginBottom: 16,
          border: urgent ? '2px solid #ff4d4f' : undefined,
          boxShadow: urgent ? '0 0 8px rgba(255, 77, 79, 0.3)' : undefined,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              <a
                onClick={() => router.push(`/customers/${customer.id}`)}
                style={{ color: '#1890ff', cursor: 'pointer' }}
              >
                <UserOutlined style={{ marginRight: 8 }} />
                {customer.name}
              </a>
              {urgent && <Tag color="red" style={{ marginLeft: 8 }}>要対応</Tag>}
            </h3>
            {customer.statusInfo?.current_status && (
              <Tag color="blue" style={{ marginTop: 8 }}>
                {customer.statusInfo.current_status}
              </Tag>
            )}
          </div>
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
            流入日: {dayjs(customer.inflow_date).format('YYYY-MM-DD HH:mm')}
          </div>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          icon={<PhoneFilled />}
          onClick={() => router.push(`/call-work?customerId=${customer.id}`)}
          size="large"
          style={{ minWidth: 120, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          架電
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => showModal(customer)}
          size="large"
          style={{ minWidth: 120 }}
        >
          編集
        </Button>
      </Space>
    </Card>
    );
  };

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

      {/* 検索・フィルターセクション */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="名前・メール・電話番号で検索"
              prefix={<SearchOutlined />}
              value={filters.searchText}
              onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              size={isMobile ? 'large' : 'middle'}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              mode="multiple"
              placeholder="ステータスで絞り込み"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: '100%' }}
              size={isMobile ? 'large' : 'middle'}
              allowClear
              maxTagCount={2}
            >
              {STATUS_OPTIONS.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              size={isMobile ? 'large' : 'middle'}
              style={{ width: '100%' }}
              type={showFilters ? 'primary' : 'default'}
            >
              詳細
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              size={isMobile ? 'large' : 'middle'}
              style={{ width: '100%' }}
              disabled={!hasActiveFilters}
            >
              クリア
            </Button>
          </Col>
        </Row>

        {/* 詳細フィルター */}
        {showFilters && (
          <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>媒体</label>
              <Select
                mode="multiple"
                placeholder="媒体で絞り込み"
                value={filters.media}
                onChange={(value) => setFilters({ ...filters, media: value })}
                style={{ width: '100%' }}
                size={isMobile ? 'large' : 'middle'}
                allowClear
                maxTagCount={2}
              >
                {mediaOptions.map(media => (
                  <Option key={media} value={media}>{media}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>流入日</label>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                style={{ width: '100%' }}
                size={isMobile ? 'large' : 'middle'}
                placeholder={['開始日', '終了日']}
              />
            </Col>
          </Row>
        )}

        {/* フィルター結果表示 */}
        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          {hasActiveFilters ? (
            <span>
              <FilterOutlined style={{ marginRight: 4 }} />
              {filteredCustomers.length}件 / {customers.length}件を表示
            </span>
          ) : (
            <span>全{customers.length}件</span>
          )}
        </div>
      </Card>

      {isMobile ? (
        <div style={{ margin: '0 -8px' }}>
          {loading ? (
            <Card loading={true} />
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              <CustomerCard key={customer.id} customer={customer} />
            ))
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                {hasActiveFilters ? '条件に一致する顧客がありません' : '顧客データがありません'}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <>
          <style jsx global>{`
            .urgent-customer-row > td,
            .urgent-customer-row > td.ant-table-column-sort,
            .ant-table-tbody > tr.urgent-customer-row > td,
            .ant-table-tbody > tr.urgent-customer-row > td.ant-table-column-sort {
              background-color: #fff2f0 !important;
            }
            .urgent-customer-row {
              outline: 2px solid #ff4d4f;
              outline-offset: -2px;
            }
          `}</style>
          <Table
            columns={columns}
            dataSource={filteredCustomers}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 30,
              showSizeChanger: true,
              pageSizeOptions: ['10', '30', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
            }}
            scroll={{ x: 1000 }}
            locale={{ emptyText: hasActiveFilters ? '条件に一致する顧客がありません' : '顧客データがありません' }}
            rowClassName={(record) => isUrgentCustomer(record) ? 'urgent-customer-row' : ''}
          />
        </>
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
          {/* ステータス情報（編集時のみ表示） */}
          {editingCustomer && (
            <>
              <Divider titlePlacement="left" style={{ fontSize: 16, fontWeight: 600 }}>ステータス</Divider>
              <Row gutter={isMobile ? 0 : 16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="current_status" label="ステータス">
                    <Select size={isMobile ? 'large' : 'middle'} placeholder="ステータスを選択">
                      {STATUS_OPTIONS.map(status => (
                        <Option key={status} value={status}>{status}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="priority" label="優先度">
                    <Select size={isMobile ? 'large' : 'middle'} placeholder="優先度を選択">
                      <Option value="低">低</Option>
                      <Option value="中">中</Option>
                      <Option value="高">高</Option>
                      <Option value="最優先">最優先</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

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
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="current_salary" label="現年収">
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber min={0} style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
                  <Input style={{ width: 'auto', pointerEvents: 'none' }} value="万円" readOnly />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="company_experience_count" label="社数経験">
                <InputNumber min={0} max={50} style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} placeholder="社" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="job_change_schedule" label="転職希望時期">
                <Select size={isMobile ? 'large' : 'middle'} allowClear placeholder="選択してください">
                  <Option value="すぐにでも">すぐにでも</Option>
                  <Option value="1ヶ月以内">1ヶ月以内</Option>
                  <Option value="3ヶ月以内">3ヶ月以内</Option>
                  <Option value="6ヶ月以内">6ヶ月以内</Option>
                  <Option value="1年以内">1年以内</Option>
                  <Option value="未定">未定</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="job_change_status" label="転職活動状況">
                <Select size={isMobile ? 'large' : 'middle'} allowClear placeholder="選択してください">
                  <Option value="情報収集中">情報収集中</Option>
                  <Option value="積極的に活動中">積極的に活動中</Option>
                  <Option value="良い案件があれば">良い案件があれば</Option>
                  <Option value="内定保有">内定保有</Option>
                  <Option value="活動休止中">活動休止中</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

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
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="final_education" label="最終学歴">
                <Select size={isMobile ? 'large' : 'middle'} allowClear placeholder="選択してください">
                  <Option value="中学卒">中学卒</Option>
                  <Option value="高校卒">高校卒</Option>
                  <Option value="専門学校卒">専門学校卒</Option>
                  <Option value="短大卒">短大卒</Option>
                  <Option value="大学卒">大学卒</Option>
                  <Option value="大学院卒">大学院卒</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="employment_start_period" label="入社可能時期">
                <Select size={isMobile ? 'large' : 'middle'} allowClear placeholder="選択してください">
                  <Option value="即日">即日</Option>
                  <Option value="2週間以内">2週間以内</Option>
                  <Option value="1ヶ月以内">1ヶ月以内</Option>
                  <Option value="2ヶ月以内">2ヶ月以内</Option>
                  <Option value="3ヶ月以内">3ヶ月以内</Option>
                  <Option value="応相談">応相談</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" style={{ fontSize: 16, fontWeight: 600 }}>その他</Divider>
          <Row gutter={isMobile ? 0 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item name="drivers_license" label="運転免許">
                <Select size={isMobile ? 'large' : 'middle'} allowClear placeholder="選択してください">
                  <Option value={true}>あり</Option>
                  <Option value={false}>なし</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="available_time" label="繋がりやすい時間帯">
                <Input size={isMobile ? 'large' : 'middle'} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="transfer_reason" label="転職理由">
            <Input.TextArea rows={3} size={isMobile ? 'large' : 'middle'} placeholder="転職理由を入力してください" />
          </Form.Item>
        </Form>
        </Modal>
      )}
    </div>
  );
}
