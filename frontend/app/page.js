'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { customerAPI, statusAPI } from '@/lib/api';

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

export default function Dashboard() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalCalls: 0,
    activeCustomers: 0,
  });
  const [statusSummary, setStatusSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [customersRes, statusSummaryRes] = await Promise.all([
        customerAPI.getAll(),
        statusAPI.getSummary(),
      ]);

      setStats({
        totalCustomers: customersRes.data.length,
        totalCalls: customersRes.data.reduce(
          (acc, customer) => acc + (customer.callHistories?.length || 0),
          0
        ),
        activeCustomers: customersRes.data.filter(
          (c) => c.statusInfo?.current_status !== '休眠'
        ).length,
      });

      setStatusSummary(statusSummaryRes.data);
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ステータス',
      dataIndex: 'current_status',
      key: 'current_status',
    },
    {
      title: '件数',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0' }}>
      <h1 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 16 }}>ダッシュボード</h1>
      <Row gutter={[16, 16]} style={{ marginBottom: 24, margin: isMobile ? '0 -8px 24px' : '0 0 24px 0' }}>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="総顧客数"
              value={stats.totalCustomers}
              prefix={<UserOutlined style={{ fontSize: isMobile ? 24 : 20 }} />}
              loading={loading}
              styles={{ content: { fontSize: isMobile ? 32 : 24 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="アクティブ顧客"
              value={stats.activeCustomers}
              prefix={<CheckCircleOutlined style={{ fontSize: isMobile ? 24 : 20 }} />}
              loading={loading}
              styles={{ content: { fontSize: isMobile ? 32 : 24 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="総架電数"
              value={stats.totalCalls}
              prefix={<PhoneOutlined style={{ fontSize: isMobile ? 24 : 20 }} />}
              loading={loading}
              styles={{ content: { fontSize: isMobile ? 32 : 24 } }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="ステータス別顧客数" style={{ margin: isMobile ? '0 -8px' : '0' }}>
        <Table
          columns={columns}
          dataSource={statusSummary}
          rowKey="current_status"
          loading={loading}
          pagination={false}
          scroll={{ x: 400 }}
          size={isMobile ? 'small' : 'default'}
        />
      </Card>
    </div>
  );
}
