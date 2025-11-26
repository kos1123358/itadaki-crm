# Itadaki CRM - 人材紹介事業向けCRMシステム

React + Node.jsで構築された人材紹介事業向けの顧客関係管理（CRM）システムです。

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

## 技術スタック

### バックエンド
- Node.js
- Express
- Sequelize (ORM)
- SQLite (開発環境) / PostgreSQL (本番環境推奨)

### フロントエンド
- React 18
- React Router v6
- Ant Design (UI コンポーネント)
- Axios (HTTP クライアント)
- Day.js (日付処理)

## セットアップ

### 必要な環境
- Node.js 16.x 以上
- npm または yarn

### バックエンドのセットアップ

```bash
# バックエンドディレクトリに移動
cd backend

# 依存パッケージのインストール
npm install

# 環境変数設定ファイルの作成
cp .env.example .env

# サーバーの起動（開発モード）
npm run dev

# または通常起動
npm start
```

サーバーは `http://localhost:5000` で起動します。

### フロントエンドのセットアップ

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start
```

フロントエンドは `http://localhost:3000` で起動します。

## API エンドポイント

### 顧客API
- `GET /api/customers` - 顧客一覧取得
- `GET /api/customers/:id` - 顧客詳細取得
- `POST /api/customers` - 顧客新規登録
- `PUT /api/customers/:id` - 顧客情報更新
- `DELETE /api/customers/:id` - 顧客削除
- `GET /api/customers/search` - 顧客検索

### 架電履歴API
- `GET /api/call-histories` - 架電履歴一覧取得
- `GET /api/call-histories/customer/:customerId` - 特定顧客の架電履歴取得
- `POST /api/call-histories` - 架電履歴作成
- `PUT /api/call-histories/:id` - 架電履歴更新
- `DELETE /api/call-histories/:id` - 架電履歴削除

### ステータスAPI
- `GET /api/statuses` - ステータス一覧取得
- `GET /api/statuses/summary` - ステータス集計取得
- `GET /api/statuses/customer/:customerId` - 特定顧客のステータス取得
- `PUT /api/statuses/customer/:customerId` - ステータス更新

## データベース

開発環境ではSQLiteを使用していますが、本番環境ではPostgreSQLの使用を推奨します。

### PostgreSQLへの切り替え

1. PostgreSQLをインストール
2. データベースを作成
3. `backend/.env`ファイルを編集

```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itadaki_crm
DB_USER=your_username
DB_PASSWORD=your_password
```

4. `backend/config/database.js`を本番環境用に変更

## プロジェクト構造

```
itadaki-crm/
├── backend/
│   ├── config/
│   │   └── database.js          # データベース設定
│   ├── models/
│   │   ├── Customer.js          # 顧客モデル
│   │   ├── CallHistory.js       # 架電履歴モデル
│   │   ├── Status.js            # ステータスモデル
│   │   └── index.js             # モデル関連付け
│   ├── controllers/
│   │   ├── customerController.js
│   │   ├── callHistoryController.js
│   │   └── statusController.js
│   ├── routes/
│   │   ├── customers.js
│   │   ├── callHistories.js
│   │   └── statuses.js
│   ├── server.js                # エントリーポイント
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/          # 共通コンポーネント
│   │   ├── pages/
│   │   │   ├── Dashboard.js     # ダッシュボード
│   │   │   ├── CustomerList.js  # 顧客一覧
│   │   │   ├── CustomerDetail.js # 顧客詳細
│   │   │   └── CallHistoryList.js # 架電履歴一覧
│   │   ├── services/
│   │   │   └── api.js           # API通信
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## 今後の拡張可能性

- ユーザー認証・認可機能
- 求人情報管理機能
- マッチング機能
- レポート・分析機能
- メール送信機能
- ファイルアップロード機能（履歴書など）
- カレンダー統合
- 通知機能

## ライセンス

MIT
