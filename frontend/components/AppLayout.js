'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, Drawer, Button, Dropdown, Avatar, message, Spin } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  DashboardOutlined,
  MenuOutlined,
  LogoutOutlined,
  PhoneFilled,
} from '@ant-design/icons';
import { useAuth } from '@/lib/AuthContext';

const { Header, Content, Sider } = Layout;

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

export default function AppLayout({ children }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, loading, signOut } = useAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, loading, isLoginPage, router]);

  const getSelectedKey = () => {
    if (pathname === '/') return '1';
    if (pathname.startsWith('/customers')) return '2';
    if (pathname.startsWith('/call-work')) return '3';
    if (pathname.startsWith('/call-histories')) return '4';
    return '1';
  };

  const isCallWorkPage = pathname === '/call-work';

  const handleLogout = async () => {
    try {
      await signOut();
      message.success('ログアウトしました');
      router.push('/login');
    } catch (error) {
      message.error('ログアウトに失敗しました');
    }
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
      onClick: handleLogout,
    },
  ];

  const menuItemsConfig = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: <Link href="/" onClick={() => setDrawerVisible(false)}>ダッシュボード</Link>,
    },
    {
      key: '2',
      icon: <UserOutlined />,
      label: <Link href="/customers" onClick={() => setDrawerVisible(false)}>顧客管理</Link>,
    },
    {
      key: '3',
      icon: <PhoneFilled />,
      label: <Link href="/call-work" onClick={() => setDrawerVisible(false)}>架電業務</Link>,
    },
    {
      key: '4',
      icon: <PhoneOutlined />,
      label: <Link href="/call-histories" onClick={() => setDrawerVisible(false)}>架電履歴</Link>,
    },
  ];

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // If on login page, show children without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not authenticated and not on login page, show nothing (will redirect)
  if (!user) {
    return null;
  }

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
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
            <span style={{ color: 'white' }}>{user?.email}</span>
          </div>
        </Dropdown>
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
          style={{ zIndex: 200 }}
        >
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItemsConfig}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Drawer
          title="メニュー"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="mobile-drawer"
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItemsConfig}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Drawer>
        <Layout style={{ padding: isCallWorkPage ? '0' : (isMobile ? '0' : '16px') }}>
          <Content
            style={{
              padding: isCallWorkPage ? '0' : (isMobile ? '0' : '16px'),
              margin: 0,
              minHeight: 280,
              background: isCallWorkPage ? 'transparent' : '#fff',
              borderRadius: isCallWorkPage ? '0' : (isMobile ? '0' : '8px'),
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
