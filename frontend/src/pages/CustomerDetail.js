import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { customerAPI, callHistoryAPI, statusAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [callForm] = Form.useForm();
  const [statusForm] = Form.useForm();

  useEffect(() => {
    fetchCustomerDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getById(id);
      setCustomer(response.data);
      if (response.data.statusInfo) {
        statusForm.setFieldsValue(response.data.statusInfo);
      }
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

  const callColumns = [
    {
      title: '架電日時',
      dataIndex: 'call_date',
      key: 'call_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '種別',
      dataIndex: 'call_type',
      key: 'call_type',
    },
    {
      title: '結果',
      dataIndex: 'call_result',
      key: 'call_result',
    },
    {
      title: '担当者',
      dataIndex: 'staff_name',
      key: 'staff_name',
    },
    {
      title: 'メモ',
      dataIndex: 'notes',
      key: 'notes',
    },
  ];

  if (loading || !customer) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/customers')}
        style={{ marginBottom: 16 }}
      >
        戻る
      </Button>

      <Card
        title={`顧客詳細: ${customer.name}`}
        style={{ marginBottom: 16 }}
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
        style={{ marginBottom: 16 }}
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
        title="架電履歴"
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
        <Table
          columns={callColumns}
          dataSource={customer.callHistories || []}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title="架電履歴追加"
        open={isCallModalVisible}
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

      <Modal
        title="ステータス更新"
        open={isStatusModalVisible}
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
              <Option value="新規登録">新規登録</Option>
              <Option value="初回コンタクト待ち">初回コンタクト待ち</Option>
              <Option value="初回面談済み">初回面談済み</Option>
              <Option value="求人紹介中">求人紹介中</Option>
              <Option value="応募準備中">応募準備中</Option>
              <Option value="書類選考中">書類選考中</Option>
              <Option value="面接調整中">面接調整中</Option>
              <Option value="一次面接済み">一次面接済み</Option>
              <Option value="二次面接済み">二次面接済み</Option>
              <Option value="最終面接済み">最終面接済み</Option>
              <Option value="内定">内定</Option>
              <Option value="入社決定">入社決定</Option>
              <Option value="保留中">保留中</Option>
              <Option value="辞退">辞退</Option>
              <Option value="不採用">不採用</Option>
              <Option value="休眠">休眠</Option>
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
    </div>
  );
};

export default CustomerDetail;
