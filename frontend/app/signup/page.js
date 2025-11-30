'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title } = Typography;

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLからトークンを取得して検証
    const checkToken = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (type === 'invite' && token) {
        setTokenValid(true);
      } else {
        message.error('無効な招待リンクです');
        router.push('/login');
      }
    };

    checkToken();
  }, [searchParams, router]);

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      // 招待を受け入れてパスワードを設定
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;

      message.success('アカウントが作成されました');
      router.push('/');
    } catch (error) {
      console.error('サインアップエラー:', error);
      message.error(error.message || 'アカウント作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
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
        <Card style={{ width: '100%', maxWidth: 450, margin: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3}>招待リンクを確認中...</Title>
          </div>
        </Card>
      </div>
    );
  }

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
            パスワードを設定してアカウントを作成
          </Typography.Text>
        </div>

        <Form
          name="signup"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="password"
            label="パスワード"
            rules={[
              { required: true, message: 'パスワードを入力してください' },
              { min: 6, message: 'パスワードは6文字以上にしてください' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="パスワード（確認）"
            rules={[
              { required: true, message: 'パスワードを再入力してください' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード（確認）"
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
              アカウントを作成
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
