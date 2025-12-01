'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, message, Modal } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

const { Title, Link } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  const onLoginFinish = async (values) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      message.success('ログインしました');
      router.push('/');
    } catch (error) {
      message.error(error.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      message.error('メールアドレスを入力してください');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/set-password`,
      });

      if (error) throw error;

      message.success('パスワードリセットメールを送信しました。メールを確認してください。');
      setResetModalVisible(false);
      setResetEmail('');
    } catch (error) {
      message.error(error.message || 'メール送信に失敗しました');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          margin: '20px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Itadaki CRM</Title>
          <Typography.Text type="secondary">
            人材紹介事業向けCRMシステム
          </Typography.Text>
        </div>

        <Form
          name="login"
          onFinish={onLoginFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="メールアドレス"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'パスワードを入力してください' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              ログイン
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link onClick={() => setResetModalVisible(true)}>
              パスワードを忘れた方・初回ログインの方
            </Link>
          </div>
        </Form>

        <Modal
          title="パスワードリセット"
          open={resetModalVisible}
          onCancel={() => setResetModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setResetModalVisible(false)}>
              キャンセル
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={resetLoading}
              onClick={handlePasswordReset}
            >
              リセットメールを送信
            </Button>,
          ]}
        >
          <p style={{ marginBottom: 16 }}>
            登録済みのメールアドレスを入力してください。パスワード設定用のリンクをお送りします。
          </p>
          <Input
            prefix={<MailOutlined />}
            placeholder="メールアドレス"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            onPressEnter={handlePasswordReset}
          />
        </Modal>
      </Card>
    </div>
  );
}
