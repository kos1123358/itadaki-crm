'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Card, Tag, Row, Col, Divider, notification, Descriptions, Timeline, Typography, Spin } from 'antd';
import { PlusOutlined, EditOutlined, PhoneOutlined, MailOutlined, UserOutlined, PhoneFilled, SearchOutlined, FilterOutlined, ClearOutlined, BellOutlined, CalendarOutlined, HistoryOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { customerAPI, statusAPI, callHistoryAPI, statusHistoryAPI } from '@/lib/api';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Text } = Typography;

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

// 顧客詳細パネルコンポーネント
const CustomerDetailPanel = ({
  customer,
  onClose,
  onEdit,
  onRefresh,
  isMobile
}) => {
  const router = useRouter();
  const [statusHistories, setStatusHistories] = useState([]);
  const [loadingHistories, setLoadingHistories] = useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [callForm] = Form.useForm();
  const [statusForm] = Form.useForm();

  useEffect(() => {
    if (customer?.id) {
      fetchStatusHistories();
      if (customer.statusInfo) {
        statusForm.setFieldsValue(customer.statusInfo);
      }
    }
  }, [customer?.id]);

  const fetchStatusHistories = async () => {
    try {
      setLoadingHistories(true);
      const response = await statusHistoryAPI.getByCustomer(customer.id);
      setStatusHistories(response.data || []);
    } catch (error) {
      console.error('ステータス履歴取得エラー:', error);
    } finally {
      setLoadingHistories(false);
    }
  };

  const handleAddCall = async () => {
    try {
      const values = await callForm.validateFields();
      await callHistoryAPI.create({
        ...values,
        customer_id: customer.id,
        call_date: values.call_date.toISOString(),
        next_contact_date: values.next_contact_date
          ? values.next_contact_date.toISOString()
          : null,
      });
      message.success('架電履歴を追加しました');
      setIsCallModalVisible(false);
      callForm.resetFields();
      onRefresh();
    } catch (error) {
      message.error('架電履歴の追加に失敗しました');
      console.error('架電履歴追加エラー:', error);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const values = await statusForm.validateFields();
      await statusAPI.update(customer.id, values);
      message.success('ステータスを更新しました');
      setIsStatusModalVisible(false);
      onRefresh();
      fetchStatusHistories();
    } catch (error) {
      message.error('ステータスの更新に失敗しました');
      console.error('ステータス更新エラー:', error);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '顧客を削除しますか？',
      content: 'この操作は取り消せません。関連する架電履歴やステータス情報も全て削除されます。',
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          await customerAPI.delete(customer.id);
          message.success('顧客を削除しました');
          onClose();
          onRefresh();
        } catch (error) {
          message.error('削除に失敗しました');
          console.error('削除エラー:', error);
        }
      },
    });
  };

  if (!customer) return null;

  const latestCallWithNextAction = customer.callHistories?.find(
    (h) => h.next_action || h.next_contact_date
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fafafa'
      }}>
        <Space>
          <Text strong style={{ fontSize: 16 }}>{customer.name}</Text>
          {customer.statusInfo?.current_status && (
            <Tag color="blue">{customer.statusInfo.current_status}</Tag>
          )}
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PhoneFilled />}
            onClick={() => router.push(`/call-work?customerId=${customer.id}`)}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            size="small"
          >
            架電
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(customer)}
            size="small"
          >
            編集
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            size="small"
          >
            削除
          </Button>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </Space>
      </div>

      {/* コンテンツ（スクロール可能） */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* ステータス情報 */}
        <Card
          title="ステータス"
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Button size="small" icon={<EditOutlined />} onClick={() => setIsStatusModalVisible(true)}>
              更新
            </Button>
          }
        >
          {customer.statusInfo ? (
            <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
              <Descriptions.Item label="ステータス">
                <Tag color="blue">{customer.statusInfo.current_status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="優先度">
                <Tag color={
                  customer.statusInfo.priority === '最優先' ? 'red' :
                  customer.statusInfo.priority === '高' ? 'orange' :
                  customer.statusInfo.priority === '中' ? 'blue' : 'default'
                }>
                  {customer.statusInfo.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="担当者">
                {customer.statusInfo.assigned_staff || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最終連絡日">
                {customer.statusInfo.last_contact_date
                  ? dayjs(customer.statusInfo.last_contact_date).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">ステータス情報がありません</Text>
          )}
        </Card>

        {/* ネクストアクション */}
        {latestCallWithNextAction && (
          <Card
            title={<><CalendarOutlined /> ネクストアクション</>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
              <Descriptions.Item label="予定日時">
                {latestCallWithNextAction.next_contact_date
                  ? dayjs(latestCallWithNextAction.next_contact_date).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="次回アクション">
                {latestCallWithNextAction.next_action || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 基本情報 */}
        <Card title="基本情報" size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="ふりがな">{customer.furigana || '-'}</Descriptions.Item>
            <Descriptions.Item label="電話番号">
              {customer.phone_number ? (
                <a href={`tel:${customer.phone_number}`} style={{ color: '#1890ff' }}>
                  {customer.phone_number}
                </a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="メール">{customer.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="年齢・性別">
              {customer.age ? `${customer.age}歳` : '-'} / {customer.gender || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="住所">{customer.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="媒体">{customer.media || '-'}</Descriptions.Item>
            <Descriptions.Item label="経路">{customer.route || '-'}</Descriptions.Item>
            <Descriptions.Item label="流入日">
              {customer.inflow_date ? dayjs(customer.inflow_date).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="繋がりやすい時間帯">
              <Text type="warning" strong>{customer.available_time || '-'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 職務情報 */}
        <Card title="職務情報" size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="現職">{customer.current_company || '-'}</Descriptions.Item>
            <Descriptions.Item label="現職種">{customer.current_job_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="現年収">
              {customer.current_salary ? `${customer.current_salary}万円` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="社数経験">
              {customer.company_experience_count ? `${customer.company_experience_count}社` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="転職希望時期">{customer.job_change_schedule || '-'}</Descriptions.Item>
            <Descriptions.Item label="転職活動状況">{customer.job_change_status || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 希望条件 */}
        <Card title="希望条件" size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="希望職種">{customer.desired_job_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="希望業種">{customer.desired_industry || '-'}</Descriptions.Item>
            <Descriptions.Item label="希望年収">
              {customer.desired_salary ? `${customer.desired_salary}万円` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="希望勤務地">{customer.desired_work_location || '-'}</Descriptions.Item>
            <Descriptions.Item label="最終学歴">{customer.final_education || '-'}</Descriptions.Item>
            <Descriptions.Item label="入社可能時期">{customer.employment_start_period || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* その他 */}
        <Card title="その他" size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={1} labelStyle={{ width: 130, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="運転免許">
              {customer.drivers_license === true ? 'あり' : customer.drivers_license === false ? 'なし' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="転職理由">{customer.transfer_reason || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 架電履歴 */}
        <Card
          title={<><HistoryOutlined /> 架電履歴</>}
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsCallModalVisible(true)}>
              追加
            </Button>
          }
        >
          {customer.callHistories && customer.callHistories.length > 0 ? (
            <Timeline
              items={customer.callHistories.map(history => ({
                color: history.call_result === '接続成功' ? 'green' : 'red',
                children: (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>
                      {dayjs(history.call_date).format('YYYY-MM-DD HH:mm')}
                    </Text>
                    <br />
                    <Space size="small">
                      <Tag style={{ fontSize: 11 }}>{history.call_type}</Tag>
                      <Tag color={history.call_result === '接続成功' ? 'green' : 'red'} style={{ fontSize: 11 }}>
                        {history.call_result}
                      </Tag>
                    </Space>
                    {history.notes && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{history.notes}</Text>
                      </div>
                    )}
                    {(history.next_action || history.next_contact_date) && (
                      <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #1890ff' }}>
                        <Text style={{ fontSize: 11, color: '#1890ff' }}>ネクストアクション</Text>
                        {history.next_contact_date && (
                          <div><Text type="secondary" style={{ fontSize: 11 }}>予定: {dayjs(history.next_contact_date).format('YYYY-MM-DD HH:mm')}</Text></div>
                        )}
                        {history.next_action && (
                          <div><Text style={{ fontSize: 11 }}>{history.next_action}</Text></div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }))}
            />
          ) : (
            <Text type="secondary">まだ架電履歴がありません</Text>
          )}
        </Card>

        {/* ステータス変更履歴 */}
        <Card title="ステータス変更履歴" size="small">
          {loadingHistories ? (
            <Spin />
          ) : statusHistories.length > 0 ? (
            <Table
              columns={[
                {
                  title: '日時',
                  dataIndex: 'changed_at',
                  key: 'changed_at',
                  width: 100,
                  render: (date) => dayjs(date).format('MM-DD HH:mm'),
                },
                {
                  title: '変更後',
                  dataIndex: 'new_status',
                  key: 'new_status',
                  render: (status) => <Tag color="blue" style={{ fontSize: 11 }}>{status}</Tag>,
                },
              ]}
              dataSource={statusHistories}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: '履歴なし' }}
            />
          ) : (
            <Text type="secondary">まだステータス変更履歴がありません</Text>
          )}
        </Card>
      </div>

      {/* 架電履歴追加モーダル */}
      <Modal
        title="架電履歴追加"
        open={isCallModalVisible}
        onOk={handleAddCall}
        onCancel={() => {
          setIsCallModalVisible(false);
          callForm.resetFields();
        }}
        okText="追加"
        cancelText="キャンセル"
      >
        <Form form={callForm} layout="vertical">
          <Form.Item name="call_date" label="架電日時" initialValue={dayjs()} rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="call_type" label="種別" rules={[{ required: true }]}>
            <Select>
              <Option value="発信">発信</Option>
              <Option value="着信">着信</Option>
              <Option value="メール">メール</Option>
              <Option value="その他">その他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="call_result" label="結果">
            <Select>
              <Option value="接続成功">接続成功</Option>
              <Option value="不在">不在</Option>
              <Option value="留守電">留守電</Option>
              <Option value="拒否">拒否</Option>
              <Option value="その他">その他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="staff_name" label="担当者名">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="メモ">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="next_action" label="次回アクション">
            <Input />
          </Form.Item>
          <Form.Item name="next_contact_date" label="予定日時">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ステータス更新モーダル */}
      <Modal
        title="ステータス更新"
        open={isStatusModalVisible}
        onOk={handleUpdateStatus}
        onCancel={() => setIsStatusModalVisible(false)}
        okText="更新"
        cancelText="キャンセル"
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="current_status" label="ステータス" rules={[{ required: true }]}>
            <Select>
              {STATUS_OPTIONS.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="優先度">
            <Select>
              <Option value="低">低</Option>
              <Option value="中">中</Option>
              <Option value="高">高</Option>
              <Option value="最優先">最優先</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assigned_staff" label="担当者">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="備考">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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

  // 緊急対応が必要な顧客かどうか判定
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

      if (filters.status.length > 0) {
        const customerStatus = customer.statusInfo?.current_status;
        if (!customerStatus || !filters.status.includes(customerStatus)) {
          return false;
        }
      }

      if (filters.media.length > 0) {
        if (!customer.media || !filters.media.includes(customer.media)) {
          return false;
        }
      }

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

  const clearFilters = () => {
    setFilters({
      searchText: '',
      status: [],
      media: [],
      dateRange: null,
    });
  };

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
    setCustomers(prev => {
      if (prev.some(c => c.id === newCustomer.id)) return prev;
      return [{ ...newCustomer, statusInfo: null, callHistories: [] }, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((updatedCustomer) => {
    setCustomers(prev =>
      prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c)
    );
    if (selectedCustomer?.id === updatedCustomer.id) {
      setSelectedCustomer(prev => ({ ...prev, ...updatedCustomer }));
    }
  }, [selectedCustomer]);

  const handleRealtimeDelete = useCallback((deletedCustomer) => {
    setCustomers(prev => prev.filter(c => c.id !== deletedCustomer.id));
    if (selectedCustomer?.id === deletedCustomer.id) {
      setSelectedCustomer(null);
    }
  }, [selectedCustomer]);

  useRealtimeSubscription('customers', {
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  const handleStatusUpdate = useCallback((updatedStatus) => {
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
    if (selectedCustomer?.id === updatedStatus.customer_id) {
      setSelectedCustomer(prev => ({
        ...prev,
        statusInfo: {
          ...prev.statusInfo,
          current_status: updatedStatus.current_status,
          priority: updatedStatus.priority,
        }
      }));
    }
  }, [selectedCustomer]);

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

  const handleSelectCustomer = async (customer) => {
    try {
      const response = await customerAPI.getById(customer.id);
      setSelectedCustomer(response.data);
    } catch (error) {
      message.error('顧客詳細の取得に失敗しました');
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
      const { current_status, priority, ...customerValues } = values;

      const formattedValues = {
        ...customerValues,
        inflow_date: customerValues.inflow_date ? customerValues.inflow_date.toISOString() : null,
      };

      if (editingCustomer) {
        await customerAPI.update(editingCustomer.id, formattedValues);

        if (current_status) {
          await statusAPI.update(editingCustomer.id, {
            current_status,
            priority: priority || '中',
          });
        }

        message.success('顧客情報を更新しました');

        // 選択中の顧客を更新
        if (selectedCustomer?.id === editingCustomer.id) {
          const response = await customerAPI.getById(editingCustomer.id);
          setSelectedCustomer(response.data);
        }
      } else {
        const newCustomer = await customerAPI.create(formattedValues);

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
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/call-work?customerId=${record.id}`);
            }}
            title="架電"
          />
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#1890ff', fontSize: 18 }} />}
            onClick={(e) => {
              e.stopPropagation();
              showModal(record);
            }}
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
            onClick={() => handleSelectCustomer(record)}
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
          status === '内定' || status === '入社決定' ? 'green' :
          status === '断念' ? 'red' :
          status === '面談設定済' || status === '選考中' ? 'blue' :
          status === '未接触' ? 'orange' :
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
      width: 150,
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
                onClick={() => handleSelectCustomer(customer)}
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
    <div style={{ padding: isMobile ? '12px 8px' : '0', height: 'calc(100vh - 120px)' }}>
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
        // モバイル表示
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

          {/* モバイル用詳細モーダル */}
          <Modal
            title={null}
            open={!!selectedCustomer}
            onCancel={() => setSelectedCustomer(null)}
            footer={null}
            width="100%"
            style={{ top: 0, maxWidth: '100%', margin: 0, padding: 0 }}
            styles={{ body: { padding: 0, height: 'calc(100vh - 55px)' } }}
          >
            <CustomerDetailPanel
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              onEdit={showModal}
              onRefresh={async () => {
                await fetchCustomers();
                if (selectedCustomer) {
                  const response = await customerAPI.getById(selectedCustomer.id);
                  setSelectedCustomer(response.data);
                }
              }}
              isMobile={true}
            />
          </Modal>
        </div>
      ) : (
        // デスクトップ表示（スプリットビュー）
        <Row gutter={16} style={{ height: 'calc(100% - 180px)' }}>
          {selectedCustomer && (
            <Col span={10} style={{ height: '100%', transition: 'all 0.3s' }}>
              <Card
                style={{ height: '100%', overflow: 'hidden' }}
                styles={{ body: { padding: 0, height: 'calc(100% - 1px)', overflow: 'hidden' } }}
              >
                <CustomerDetailPanel
                  customer={selectedCustomer}
                  onClose={() => setSelectedCustomer(null)}
                  onEdit={showModal}
                  onRefresh={async () => {
                    await fetchCustomers();
                    if (selectedCustomer) {
                      const response = await customerAPI.getById(selectedCustomer.id);
                      setSelectedCustomer(response.data);
                    }
                  }}
                  isMobile={false}
                />
              </Card>
            </Col>
          )}

          <Col span={selectedCustomer ? 14 : 24} style={{ height: '100%' }}>
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
              .selected-customer-row > td {
                background-color: #e6f7ff !important;
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
              scroll={{ x: 900, y: 'calc(100vh - 380px)' }}
              locale={{ emptyText: hasActiveFilters ? '条件に一致する顧客がありません' : '顧客データがありません' }}
              rowClassName={(record) => {
                const classes = [];
                if (isUrgentCustomer(record)) classes.push('urgent-customer-row');
                if (selectedCustomer?.id === record.id) classes.push('selected-customer-row');
                return classes.join(' ');
              }}
              onRow={(record) => ({
                onClick: () => handleSelectCustomer(record),
                style: { cursor: 'pointer' }
              })}
              size="small"
            />
          </Col>
        </Row>
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
            {editingCustomer && (
              <>
                <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>ステータス</Divider>
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

            <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>基本情報</Divider>
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

            <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>職務情報</Divider>
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

            <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>希望条件</Divider>
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

            <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>その他</Divider>
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
