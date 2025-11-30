# Itadaki CRM - Supabase セットアップガイド

このガイドでは、Itadaki CRMをSupabaseバックエンドで動作させるための手順を説明します。

## 前提条件

- Supabaseアカウント（https://supabase.com でサインアップ）
- Node.js 16以上
- Git

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. "New Project" をクリック
3. プロジェクト名を入力（例: itadaki-crm）
4. データベースパスワードを設定（安全な場所に保存）
5. リージョンを選択（日本の場合は "Northeast Asia (Tokyo)" を推奨）
6. "Create new project" をクリック

### 2. データベーススキーマの作成

1. Supabase Dashboardで、左サイドバーの "SQL Editor" をクリック
2. "New query" をクリック
3. `supabase-schema.sql` ファイルの内容をコピー＆ペースト
4. "Run" をクリックしてスキーマを実行

これにより、以下が作成されます：
- `customers` テーブル - 顧客情報
- `statuses` テーブル - 顧客のステータス
- `call_histories` テーブル - 架電履歴
- Row Level Security (RLS) ポリシー - ユーザーごとのデータ分離
- 自動更新トリガー - `updated_at` フィールドの自動更新

### 3. Supabase認証の設定

1. Supabase Dashboardで、"Authentication" → "Providers" に移動
2. "Email" プロバイダーが有効になっていることを確認
3. （オプション）必要に応じて、Google、GitHub などの OAuth プロバイダーを有効化

メール確認の設定:
1. "Authentication" → "Email Templates" に移動
2. 必要に応じて、確認メールのテンプレートをカスタマイズ
3. 開発環境では、"Authentication" → "Settings" → "Email Auth" で "Confirm email" を無効にすることも可能

### 4. 環境変数の設定

1. Supabase Dashboardで、"Settings" → "API" に移動
2. 以下の情報をコピー：
   - Project URL
   - anon public key

3. フロントエンドの `.env.local` ファイルを編集：

```bash
cd frontend
```

`frontend/.env.local` を以下のように更新：

```env
NEXT_PUBLIC_SUPABASE_URL=あなたのプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon public key
```

### 5. 依存関係のインストール

```bash
cd frontend
npm install
```

### 6. アプリケーションの起動

```bash
npm run dev
```

アプリケーションが http://localhost:3000 で起動します。

### 7. 最初のユーザーの作成

1. ブラウザで http://localhost:3000/login にアクセス
2. "新規登録" タブをクリック
3. メールアドレスとパスワードを入力
4. "アカウント作成" をクリック
5. メール確認が有効な場合、確認メールが送信されます
6. ログインして使用開始

## データベース構造

### Customers（顧客）
- 基本情報：名前、メール、電話番号、住所など
- キャリア情報：現職、年収、希望職種など
- 各顧客はログインユーザーに紐付けられます（`user_id`）

### Statuses（ステータス）
- 顧客の現在のステータス（16種類）
- 優先度（低、中、高、最優先）
- 担当者、備考、最終連絡日

### Call Histories（架電履歴）
- 架電日時、種別（発信、着信、メール、その他）
- 結果（接続成功、不在、留守電、拒否、その他）
- 通話時間、メモ、次回アクション

## セキュリティ機能

### Row Level Security (RLS)

すべてのテーブルでRLSが有効になっています：

- **顧客データ**: ログインユーザーが作成した顧客のみアクセス可能
- **ステータス**: 自分の顧客のステータスのみアクセス可能
- **架電履歴**: 自分の顧客の架電履歴のみアクセス可能

これにより、複数のユーザーが同じデータベースを使用しても、自分のデータのみにアクセスできます。

### 認証

- Supabase Auth を使用したメール/パスワード認証
- JWT トークンベースのセッション管理
- 自動的なトークン更新

## トラブルシューティング

### ログインできない

1. Supabase Dashboard → Authentication → Users で、ユーザーが作成されているか確認
2. メール確認が有効な場合、メールを確認してリンクをクリック
3. ブラウザのコンソールでエラーメッセージを確認

### データが表示されない

1. ブラウザのコンソールでエラーを確認
2. Supabase Dashboard → SQL Editor で、以下のクエリを実行してデータを確認：
   ```sql
   SELECT * FROM customers;
   SELECT * FROM statuses;
   SELECT * FROM call_histories;
   ```
3. RLSポリシーが正しく設定されているか確認

### 環境変数が読み込まれない

1. `.env.local` ファイルがフロントエンドディレクトリに存在するか確認
2. 開発サーバーを再起動: `npm run dev`
3. 環境変数名が `NEXT_PUBLIC_` で始まっているか確認

## 本番環境へのデプロイ

### Vercel へのデプロイ

1. Vercel にプロジェクトをインポート
2. Environment Variables に以下を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. デプロイを実行

### その他のプラットフォーム

Next.js をサポートする任意のプラットフォームにデプロイ可能：
- Netlify
- AWS Amplify
- Cloudflare Pages

環境変数を必ず設定してください。

## バックエンド（Express）について

Supabase への移行により、以下のバックエンドコンポーネントは不要になりました：

- `backend/` ディレクトリ全体
- Express サーバー
- Sequelize ORM
- SQLite/PostgreSQL データベース

すべてのデータベース操作は Supabase のクライアントライブラリを通じて直接行われます。

ただし、カスタムビジネスロジックや外部API連携が必要な場合は、Supabase Functions（Edge Functions）を使用できます。

## サポート

問題が発生した場合：

1. [Supabase Documentation](https://supabase.com/docs)
2. [Next.js Documentation](https://nextjs.org/docs)
3. プロジェクトの GitHub Issues
