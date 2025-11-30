# Itadaki CRM - 人材紹介事業向けCRMシステム

Next.js + Supabaseで構築された人材紹介事業向けの顧客関係管理（CRM）システムです。

## 主な機能

### 顧客管理
- 顧客情報の登録・編集・削除
- 詳細な顧客プロフィール管理
  - 基本情報（名前、連絡先、年齢、性別など）
  - 職務情報（現職、職種、年収など）
  - 転職希望情報（希望職種、希望年収、希望勤務地など）
  - その他（媒体、流入日、繋がりやすい時間帯など）

### 架電履歴管理
- 架電履歴の記録・閲覧
- 架電種別（発信、着信、メール、その他）
- 架電結果の記録
- 次回アクション・次回連絡予定日の管理
- 担当者記録

### ステータス管理
- 顧客の進捗状況管理
- ステータス種別
  - 新規登録
  - 初回コンタクト待ち
  - 初回面談済み
  - 求人紹介中
  - 応募準備中
  - 書類選考中
  - 面接調整中
  - 一次面接済み〜最終面接済み
  - 内定
  - 入社決定
  - 保留中、辞退、不採用、休眠
- 優先度管理（低、中、高、最優先）
- 担当者割り当て

### ダッシュボード
- 総顧客数、アクティブ顧客数の表示
- 総架電数の表示
- ステータス別顧客数の一覧表示

### Webhook API
- 外部サービスから顧客を自動登録
- API Key認証によるセキュアなアクセス
- Supabase Edge Functionsで実装

## 技術スタック

### フロントエンド
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Supabase Client

### バックエンド
- Supabase (BaaS)
  - PostgreSQL データベース
  - 認証・認可
  - Edge Functions
  - リアルタイムサブスクリプション

## セットアップ

### 必要な環境
- Node.js 18.x 以上
- npm または yarn
- Supabase CLI

### 1. Supabaseのセットアップ

```bash
# Supabase CLIをインストール
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトのリンク（既存プロジェクトがある場合）
supabase link --project-ref your-project-ref

# ローカルSupabaseを起動
supabase start
```

### 2. データベースのセットアップ

```bash
# データベーススキーマを適用
supabase db push
```

または、Supabaseダッシュボードから`supabase-schema.sql`を実行してください。

### 3. フロントエンドのセットアップ

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存パッケージのインストール
npm install

# 環境変数ファイルを作成
cp .env.local.example .env.local

# .env.localを編集してSupabaseの設定を追加
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 開発サーバーの起動
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

### 4. Webhook APIのセットアップ（オプション）

詳細は [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) を参照してください。

```bash
# 環境変数を設定
supabase secrets set WEBHOOK_API_KEY=your-generated-api-key
supabase secrets set WEBHOOK_DEFAULT_USER_ID=your-user-id

# Edge Functionをデプロイ
supabase functions deploy webhook-customer
```

## プロジェクト構造

```
itadaki-crm/
├── frontend/                  # Next.jsフロントエンド
│   ├── app/                   # Next.js App Router
│   ├── components/            # Reactコンポーネント
│   ├── lib/                   # ユーティリティ・API
│   │   ├── api.js            # Supabase APIクライアント
│   │   └── supabase.js       # Supabaseクライアント設定
│   └── package.json
├── supabase/                  # Supabase設定
│   ├── functions/             # Edge Functions
│   │   └── webhook-customer/  # Webhook API
│   ├── config.toml            # Supabase設定
│   └── migrations/            # データベースマイグレーション
├── supabase-schema.sql        # データベーススキーマ
├── WEBHOOK_SETUP.md           # Webhook APIセットアップガイド
└── README.md
```

## 使用方法

### 認証

1. http://localhost:3000 にアクセス
2. サインアップまたはログイン
3. ダッシュボードが表示されます

### 顧客の登録

1. 「顧客管理」をクリック
2. 「新規登録」ボタンをクリック
3. 顧客情報を入力して保存

### Webhook経由での顧客登録

```bash
curl -X POST http://localhost:54321/functions/v1/webhook-customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "name": "山田太郎",
    "email": "yamada@example.com",
    "phone_number": "090-1234-5678",
    "priority": "高"
  }'
```

詳細は [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) を参照してください。

## 環境変数

### フロントエンド (.env.local)

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Secrets

```bash
# Webhook API Key
WEBHOOK_API_KEY=your-generated-api-key

# Webhook用デフォルトユーザーID
WEBHOOK_DEFAULT_USER_ID=your-user-id
```

## 開発

### ローカル開発環境の起動

```bash
# ターミナル1: Supabaseを起動
supabase start

# ターミナル2: フロントエンドを起動
cd frontend && npm run dev
```

### Edge Functionsのテスト

```bash
# Edge Functionをローカルで起動
supabase functions serve webhook-customer

# 別のターミナルでテスト
curl -X POST http://localhost:54321/functions/v1/webhook-customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"name":"テスト","email":"test@example.com"}'
```

## デプロイ

### Vercelへのデプロイ

```bash
cd frontend
npx vercel
```

### Supabase Edge Functionsのデプロイ

```bash
supabase functions deploy webhook-customer
```

## 今後の拡張可能性

- 求人情報管理機能
- マッチング機能
- レポート・分析機能
- メール送信機能
- ファイルアップロード機能（履歴書など）
- カレンダー統合
- 通知機能
- リアルタイム更新（Supabase Realtime）

## ライセンス

MIT

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
