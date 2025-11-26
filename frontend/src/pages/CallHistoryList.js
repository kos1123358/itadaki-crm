import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, message } from 'antd';
import { callHistoryAPI } from '../services/api';
import dayjs from 'dayjs';

const CallHistoryList = () => {
  const [callHistories, setCallHistories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCallHistories();
  }, []);

  const fetchCallHistories = async () => {
    try {
      setLoading(true);
      const response = await callHistoryAPI.getAll();
      setCallHistories(response.data);
    } catch (error) {
      message.error('架電履歴の取得に失敗しました');
      console.error('架電履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '顧客名',
      dataIndex: ['customer', 'name'],
      key: 'customer_name',
    },
    {
      title: '架電日時',
      dataIndex: 'call_date',
      key: 'call_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => dayjs(a.call_date).unix() - dayjs(b.call_date).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '種別',
      dataIndex: 'call_type',
      key: 'call_type',
      render: (type) => {
        const colorMap = {
          発信: 'blue',
          着信: 'green',
          メール: 'purple',
          その他: 'default',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
      filters: [
        { text: '発信', value: '発信' },
        { text: '着信', value: '着信' },
        { text: 'メール', value: 'メール' },
        { text: 'その他', value: 'その他' },
      ],
      onFilter: (value, record) => record.call_type === value,
    },
    {
      title: '結果',
      dataIndex: 'call_result',
      key: 'call_result',
      render: (result) => {
        const colorMap = {
          接続成功: 'success',
          不在: 'warning',
          留守電: 'processing',
          拒否: 'error',
          その他: 'default',
        };
        return result ? <Tag color={colorMap[result] || 'default'}>{result}</Tag> : '-';
      },
    },
    {
      title: '通話時間',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => (duration ? `${duration}秒` : '-'),
    },
    {
      title: '担当者',
      dataIndex: 'staff_name',
      key: 'staff_name',
      render: (name) => name || '-',
    },
    {
      title: 'メモ',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes) => notes || '-',
    },
    {
      title: '次回アクション',
      dataIndex: 'next_action',
      key: 'next_action',
      render: (action) => action || '-',
    },
    {
      title: '次回連絡予定',
      dataIndex: 'next_contact_date',
      key: 'next_contact_date',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
  ];

  return (
    <div>
      <h1>架電履歴一覧</h1>
      <Card>
        <Table
          columns={columns}
          dataSource={callHistories}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  );
};

export default CallHistoryList;
