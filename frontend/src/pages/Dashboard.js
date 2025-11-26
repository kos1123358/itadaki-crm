import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { customerAPI, statusAPI } from '../services/api';

const Dashboard = () => {
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
    <div>
      <h1>ダッシュボード</h1>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="総顧客数"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="アクティブ顧客"
              value={stats.activeCustomers}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card>
            <Statistic
              title="総架電数"
              value={stats.totalCalls}
              prefix={<PhoneOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="ステータス別顧客数">
        <Table
          columns={columns}
          dataSource={statusSummary}
          rowKey="current_status"
          loading={loading}
          pagination={false}
          scroll={{ x: 400 }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
