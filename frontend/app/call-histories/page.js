'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, message, Space, Divider } from 'antd';
import { PhoneOutlined, MailOutlined, UserOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { callHistoryAPI } from '@/lib/api';
import dayjs from 'dayjs';

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

export default function CallHistoryList() {
  const [callHistories, setCallHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

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

  // モバイル用カードコンポーネント
  const CallHistoryCard = ({ history }) => {
    const getCallTypeColor = (type) => {
      const colorMap = {
        発信: 'blue',
        着信: 'green',
        メール: 'purple',
        その他: 'default',
      };
      return colorMap[type] || 'default';
    };

    const getCallResultColor = (result) => {
      const colorMap = {
        接続成功: 'success',
        不在: 'warning',
        留守電: 'processing',
        拒否: 'error',
        その他: 'default',
      };
      return colorMap[result] || 'default';
    };

    const getIcon = (type) => {
      if (type === 'メール') return <MailOutlined />;
      return <PhoneOutlined />;
    };

    return (
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              {history.customer?.name || '不明'}
            </h3>
            <Space style={{ marginTop: 8 }} size="small">
              <Tag color={getCallTypeColor(history.call_type)} icon={getIcon(history.call_type)}>
                {history.call_type}
              </Tag>
              {history.call_result && (
                <Tag color={getCallResultColor(history.call_result)}>
                  {history.call_result}
                </Tag>
              )}
            </Space>
          </div>
          <span style={{ color: '#999', fontSize: 12 }}>ID: {history.id}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#999' }} />
            <span style={{ fontSize: 15, color: '#333', fontWeight: 500 }}>
              {dayjs(history.call_date).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>

          {history.staff_name && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>
                担当: {history.staff_name}
              </span>
            </div>
          )}

          {history.duration && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>
                通話時間: {history.duration}秒
              </span>
            </div>
          )}

          {history.notes && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 4,
              fontSize: 14,
              color: '#666'
            }}>
              {history.notes}
            </div>
          )}

          {history.next_action && (
            <div style={{ marginTop: 12 }}>
              <Tag color="orange">次回: {history.next_action}</Tag>
            </div>
          )}

          {history.next_contact_date && (
            <div style={{ marginTop: 8 }}>
              <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              <span style={{ fontSize: 14, color: '#1890ff' }}>
                次回連絡: {dayjs(history.next_contact_date).format('YYYY-MM-DD')}
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0' }}>
      <h1 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 16 }}>架電履歴一覧</h1>

      {isMobile ? (
        <div style={{ margin: '0 -8px' }}>
          {loading ? (
            <Card loading={true} />
          ) : callHistories.length > 0 ? (
            callHistories.map(history => (
              <CallHistoryCard key={history.id} history={history} />
            ))
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                架電履歴がありません
              </div>
            </Card>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
