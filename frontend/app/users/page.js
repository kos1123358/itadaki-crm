'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, message, Modal, Tag, Space } from 'antd';
import { MailOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('認証されていません');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-management?action=list`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ユーザー情報の取得に失敗しました');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      message.error(error.message || 'ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (values) => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('認証されていません');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-management?action=invite`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: values.email }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ユーザーの招待に失敗しました');
      }

      message.success(`${values.email} に招待メールを送信しました`);
      setInviteModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('招待エラー:', error);
      message.error(error.message || 'ユーザーの招待に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    Modal.confirm({
      title: 'ユーザーを削除しますか？',
      content: 'この操作は取り消せません。',
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('認証されていません');

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-management?action=delete&userId=${userId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'ユーザーの削除に失敗しました');
          }

          message.success('ユーザーを削除しました');
          fetchUsers();
        } catch (error) {
          console.error('削除エラー:', error);
          message.error(error.message || 'ユーザーの削除に失敗しました');
        }
      },
    });
  };

  const columns = [
    {
      title: 'メールアドレス',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'ステータス',
      key: 'status',
      render: (_, record) => {
        if (record.email_confirmed_at) {
          return <Tag color="green">アクティブ</Tag>;
        } else if (record.invited_at) {
          return <Tag color="orange">招待中</Tag>;
        } else {
          return <Tag color="blue">未確認</Tag>;
        }
      },
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString('ja-JP'),
    },
    {
      title: '最終ログイン',
      dataIndex: 'last_sign_in_at',
      key: 'last_sign_in_at',
      render: (date) => date ? new Date(date).toLocaleString('ja-JP') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record.id)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="ユーザー管理"
        extra={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setInviteModalVisible(true)}
          >
            ユーザーを招待
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="ユーザーを招待"
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInvite}
        >
          <Form.Item
            name="email"
            label="メールアドレス"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="user@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<UserAddOutlined />}
              >
                招待メールを送信
              </Button>
              <Button
                onClick={() => {
                  setInviteModalVisible(false);
                  form.resetFields();
                }}
              >
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
