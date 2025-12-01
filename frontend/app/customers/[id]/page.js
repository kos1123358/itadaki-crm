'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Tag,
  Timeline,
  Typography,
  Space,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, HistoryOutlined, PhoneFilled } from '@ant-design/icons';
import { customerAPI, callHistoryAPI, statusAPI, statusHistoryAPI } from '@/lib/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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

export default function CustomerDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [statusHistories, setStatusHistories] = useState([]);
  const [callForm] = Form.useForm();
  const [statusForm] = Form.useForm();

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getById(id);
      setCustomer(response.data);
      if (response.data.statusInfo) {
        statusForm.setFieldsValue(response.data.statusInfo);
      }

      // ステータス履歴を取得
      const historyResponse = await statusHistoryAPI.getByCustomer(id);
      setStatusHistories(historyResponse.data || []);
    } catch (error) {
      message.error('顧客データの取得に失敗しました');
      console.error('顧客取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCall = async () => {
    try {
      const values = await callForm.validateFields();
      await callHistoryAPI.create({
        ...values,
        customer_id: parseInt(id),
        call_date: values.call_date.toISOString(),
        next_contact_date: values.next_contact_date
          ? values.next_contact_date.toISOString()
          : null,
      });
      message.success('架電履歴を追加しました');
      setIsCallModalVisible(false);
      callForm.resetFields();
      fetchCustomerDetail();
    } catch (error) {
      message.error('架電履歴の追加に失敗しました');
      console.error('架電履歴追加エラー:', error);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const values = await statusForm.validateFields();
      await statusAPI.update(id, values);
      message.success('ステータスを更新しました');
      setIsStatusModalVisible(false);
      fetchCustomerDetail();
    } catch (error) {
      message.error('ステータスの更新に失敗しました');
      console.error('ステータス更新エラー:', error);
    }
  };


  if (loading || !customer) {
    return <div>読み込み中...</div>;
  }

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/customers')}
        >
          戻る
        </Button>
        <Button
          type="primary"
          icon={<PhoneFilled />}
          onClick={() => router.push(`/call-work?customerId=${id}`)}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          この顧客から架電開始
        </Button>
      </Space>

      <Card
        title={`顧客詳細: ${customer.name}`}
        style={{ marginBottom: 16, margin: isMobile ? '0 -8px 16px' : '0 0 16px 0' }}
      >
        <Descriptions bordered column={{ xs: 1, sm: 1, md: 2, lg: 2 }}>
          <Descriptions.Item label="ID">{customer.id}</Descriptions.Item>
          <Descriptions.Item label="名前">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="ふりがな">{customer.furigana || '-'}</Descriptions.Item>
          <Descriptions.Item label="性別">{customer.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label="年齢">{customer.age || '-'}</Descriptions.Item>
          <Descriptions.Item label="メール">{customer.email}</Descriptions.Item>
          <Descriptions.Item label="電話番号">
            {customer.phone_number ? (
              <a href={`tel:${customer.phone_number}`} style={{ color: '#1890ff' }}>
                {customer.phone_number}
              </a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="住所">{customer.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="媒体">{customer.media || '-'}</Descriptions.Item>
          <Descriptions.Item label="経路">{customer.route || '-'}</Descriptions.Item>
          <Descriptions.Item label="流入日">
            {customer.inflow_date ? dayjs(customer.inflow_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="現職">{customer.current_company || '-'}</Descriptions.Item>
          <Descriptions.Item label="現職種">{customer.current_job_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="現年収">
            {customer.current_salary ? `${customer.current_salary}万円` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="希望職種">{customer.desired_job_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="希望業種">{customer.desired_industry || '-'}</Descriptions.Item>
          <Descriptions.Item label="希望年収">
            {customer.desired_salary ? `${customer.desired_salary}万円` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="希望勤務地">{customer.desired_work_location || '-'}</Descriptions.Item>
          <Descriptions.Item label="繋がりやすい時間帯">
            {customer.available_time || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="ステータス情報"
        style={{ marginBottom: 16, margin: isMobile ? '0 -8px 16px' : '0 0 16px 0' }}
        extra={
          <Button icon={<EditOutlined />} onClick={() => setIsStatusModalVisible(true)}>
            ステータス更新
          </Button>
        }
      >
        {customer.statusInfo ? (
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2, lg: 2 }}>
            <Descriptions.Item label="現在のステータス">
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
            <Descriptions.Item label="備考" span={2}>
              {customer.statusInfo.notes || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <p>ステータス情報がありません</p>
        )}
      </Card>

      <Card
        title="ステータス変更履歴"
        style={{ marginBottom: 16, margin: isMobile ? '0 -8px 16px' : '0 0 16px 0' }}
      >
        <Table
          columns={[
            {
              title: '変更日時',
              dataIndex: 'changed_at',
              key: 'changed_at',
              render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
            },
            {
              title: '変更前ステータス',
              dataIndex: 'previous_status',
              key: 'previous_status',
              render: (status) => status ? <Tag>{status}</Tag> : '-',
            },
            {
              title: '変更後ステータス',
              dataIndex: 'new_status',
              key: 'new_status',
              render: (status) => <Tag color="blue">{status}</Tag>,
            },
            {
              title: '優先度',
              dataIndex: 'new_priority',
              key: 'new_priority',
              render: (priority) => priority ? (
                <Tag color={
                  priority === '最優先' ? 'red' :
                  priority === '高' ? 'orange' :
                  priority === '中' ? 'blue' : 'default'
                }>
                  {priority}
                </Tag>
              ) : '-',
            },
            {
              title: '担当者',
              dataIndex: 'new_assigned_staff',
              key: 'new_assigned_staff',
              render: (staff) => staff || '-',
            },
          ]}
          dataSource={statusHistories}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'まだステータス変更履歴がありません' }}
        />
      </Card>

      <Card
        title={
          <Space>
            <HistoryOutlined />
            架電履歴
          </Space>
        }
        style={{ margin: isMobile ? '0 -8px' : '0' }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCallModalVisible(true)}
          >
            架電履歴追加
          </Button>
        }
      >
        {customer.callHistories && customer.callHistories.length > 0 ? (
          <Timeline
            items={customer.callHistories.map(history => ({
              color: history.call_result === '接続成功' ? 'green' : 'red',
              children: (
                <div>
                  <Text strong>
                    {dayjs(history.call_date).format('YYYY-MM-DD HH:mm')}
                  </Text>
                  <br />
                  <Space>
                    <Tag>{history.call_type}</Tag>
                    <Tag color={history.call_result === '接続成功' ? 'green' : 'red'}>
                      {history.call_result}
                    </Tag>
                    {history.staff_name && <Text type="secondary">担当: {history.staff_name}</Text>}
                  </Space>
                  <br />
                  <Text type="secondary">{history.notes}</Text>
                </div>
              )
            }))}
          />
        ) : (
          <Text type="secondary">まだ架電履歴がありません</Text>
        )}
      </Card>

      {isCallModalVisible && (
        <Modal
          title="架電履歴追加"
          open={true}
          onOk={handleAddCall}
          onCancel={() => {
            setIsCallModalVisible(false);
            callForm.resetFields();
          }}
          width="90%"
          style={{ maxWidth: 600 }}
          okText="追加"
          cancelText="キャンセル"
        >
        <Form form={callForm} layout="vertical">
          <Form.Item
            name="call_date"
            label="架電日時"
            initialValue={dayjs()}
            rules={[{ required: true }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="call_type"
            label="種別"
            rules={[{ required: true }]}
          >
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
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="next_action" label="次回アクション">
            <Input />
          </Form.Item>
          <Form.Item name="next_contact_date" label="次回連絡予定日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        </Modal>
      )}

      {isStatusModalVisible && (
        <Modal
          title="ステータス更新"
          open={true}
          onOk={handleUpdateStatus}
          onCancel={() => setIsStatusModalVisible(false)}
          width="90%"
          style={{ maxWidth: 600 }}
          okText="更新"
          cancelText="キャンセル"
        >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="current_status"
            label="現在のステータス"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="未接触">未接触</Option>
              <Option value="接触中">接触中</Option>
              <Option value="面談設定済">面談設定済</Option>
              <Option value="面談済">面談済</Option>
              <Option value="求人提案中">求人提案中</Option>
              <Option value="応募承諾">応募承諾</Option>
              <Option value="選考中">選考中</Option>
              <Option value="内定">内定</Option>
              <Option value="入社決定">入社決定</Option>
              <Option value="保留">保留</Option>
              <Option value="断念">断念</Option>
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
            <TextArea rows={4} />
          </Form.Item>
        </Form>
        </Modal>
      )}
    </div>
  );
}
