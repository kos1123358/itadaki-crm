import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Drawer, Button } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  DashboardOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CallHistoryList from './pages/CallHistoryList';
import './App.css';

const { Header, Content, Sider } = Layout;

function AppContent() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getSelectedKey = () => {
    if (location.pathname === '/') return '1';
    if (location.pathname.startsWith('/customers')) return '2';
    if (location.pathname.startsWith('/call-histories')) return '3';
    return '1';
  };

  const menuItems = (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      style={{ height: '100%', borderRight: 0 }}
    >
      <Menu.Item key="1" icon={<DashboardOutlined />}>
        <Link to="/" onClick={() => setDrawerVisible(false)}>ダッシュボード</Link>
      </Menu.Item>
      <Menu.Item key="2" icon={<UserOutlined />}>
        <Link to="/customers" onClick={() => setDrawerVisible(false)}>顧客管理</Link>
      </Menu.Item>
      <Menu.Item key="3" icon={<PhoneOutlined />}>
        <Link to="/call-histories" onClick={() => setDrawerVisible(false)}>架電履歴</Link>
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            className="mobile-menu-button"
            type="text"
            icon={<MenuOutlined style={{ color: 'white', fontSize: '20px' }} />}
            onClick={() => setDrawerVisible(true)}
            style={{ marginRight: '16px' }}
          />
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            Itadaki CRM
          </div>
        </div>
      </Header>
      <Layout>
        <Sider
          width={200}
          theme="light"
          className="desktop-sider"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
        >
          {menuItems}
        </Sider>
        <Drawer
          title="メニュー"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="mobile-drawer"
          bodyStyle={{ padding: 0 }}
        >
          {menuItems}
        </Drawer>
        <Layout style={{ padding: '16px' }}>
          <Content
            style={{
              padding: '16px',
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/call-histories" element={<CallHistoryList />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
