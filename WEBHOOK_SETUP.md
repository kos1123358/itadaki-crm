# Webhook API セットアップガイド

## 概要

Supabase Edge Functionsを使用してWebhook APIを実装しています。外部サービスから顧客を自動登録できます。

## 必要な環境変数

以下の環境変数をSupabaseプロジェクトに設定する必要があります：

### 1. WEBHOOK_API_KEY

Webhook APIへのアクセスを認証するためのAPIキーです。

**生成方法（ローカル）：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**設定方法：**
```bash
cd supabase
supabase secrets set WEBHOOK_API_KEY=your-generated-api-key-here
```

### 2. WEBHOOK_DEFAULT_USER_ID

Webhook経由で登録された顧客に割り当てるデフォルトのユーザーIDです。

**user_idの取得方法：**
1. Supabaseダッシュボードにログイン
2. Authentication → Users から既存ユーザーのIDをコピー
3. または新規ユーザーを作成してIDを取得

**設定方法：**
```bash
supabase secrets set WEBHOOK_DEFAULT_USER_ID=your-user-id-here
```

## Edge Functionのデプロイ

### ローカル開発

```bash
# Edge Functionをローカルで起動
supabase functions serve webhook-customer

# 別のターミナルでテスト
curl -X POST http://localhost:54321/functions/v1/webhook-customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "name": "テストユーザー",
    "email": "test@example.com",
    "phone_number": "090-1234-5678",
    "priority": "高"
  }'
```

### 本番環境へのデプロイ

```bash
# Supabaseプロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# Edge Functionをデプロイ
supabase functions deploy webhook-customer
```

## Webhook APIエンドポイント

### ローカル開発
```
POST http://localhost:54321/functions/v1/webhook-customer
```

### 本番環境
```
POST https://your-project-ref.supabase.co/functions/v1/webhook-customer
```

## リクエスト形式

### 必須ヘッダー
- `Content-Type: application/json`
- `x-api-key: your-webhook-api-key`
- `Authorization: Bearer YOUR_ANON_KEY`

### リクエストボディ

**必須フィールド：**
- `name` (string): 顧客名
- `email` (string): メールアドレス

**オプションフィールド：**
- `furigana` (string): ふりがな
- `phone_number` (string): 電話番号
- `age` (number): 年齢
- `gender` (string): 性別
- `address` (string): 住所
- `media` (string): 流入元媒体
- `route` (string): 流入経路（デフォルト: "Webhook経由"）
- `current_company` (string): 現職の会社名
- `current_position` (string): 現職の役職
- `current_annual_income` (number): 現在の年収（万円）
- `desired_position` (string): 希望職種
- `desired_annual_income` (number): 希望年収（万円）
- `desired_location` (string): 希望勤務地
- `priority` (string): 優先度（"低", "中", "高", "最優先"）デフォルト: "中"

### リクエスト例

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/webhook-customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-api-key" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "name": "山田太郎",
    "furigana": "やまだたろう",
    "email": "yamada@example.com",
    "phone_number": "090-1234-5678",
    "age": 28,
    "gender": "男性",
    "current_company": "株式会社ABC",
    "current_position": "営業",
    "current_annual_income": 450,
    "desired_position": "マーケティング",
    "desired_annual_income": 500,
    "desired_location": "東京都",
    "media": "Web広告",
    "priority": "高"
  }'
```

## レスポンス形式

### 成功時（201 Created）

```json
{
  "success": true,
  "message": "Customer created successfully via webhook",
  "data": {
    "customer_id": 123,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "status": "新規登録",
    "created_at": "2025-11-30T12:00:00.000Z"
  }
}
```

### エラーレスポンス

**401 Unauthorized（APIキー無効）**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid API Key"
}
```

**400 Bad Request（必須フィールド不足）**
```json
{
  "success": false,
  "error": "Bad Request: name and email are required fields"
}
```

**409 Conflict（メールアドレス重複）**
```json
{
  "success": false,
  "error": "Conflict: Customer with this email already exists",
  "customer_id": 123
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "詳細なエラーメッセージ"
}
```

## セキュリティ

- **API Key**: 必ず強固なランダムキーを使用してください
- **HTTPS**: 本番環境では必ずHTTPSを使用してください
- **環境変数**: APIキーやシークレットは環境変数で管理し、コードにハードコードしないでください

## トラブルシューティング

### Edge Functionが起動しない

```bash
# ログを確認
supabase functions logs webhook-customer
```

### 環境変数が設定されているか確認

```bash
# ローカル環境
cat supabase/.env.local

# 本番環境
supabase secrets list
```

### データベースへの接続エラー

- `SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`が正しく設定されているか確認
- サービスロールキーはSupabaseダッシュボードのSettings → APIから取得できます
