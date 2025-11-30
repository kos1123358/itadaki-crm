# Webhook API ドキュメント

## 概要
外部サービスから顧客情報を自動登録するためのWebhook APIです。

## エンドポイント

### POST /api/webhook/customer

外部システムから顧客情報を登録します。

**URL**: `http://localhost:5001/api/webhook/customer`

**認証**: API Key（ヘッダーに含める）

**Headers**:
```
Content-Type: application/json
x-api-key: your-secret-api-key-here
```

## リクエストボディ

### 必須フィールド
- `name` (string): 顧客名
- `email` (string): メールアドレス（重複チェックあり）

### オプションフィールド
- `furigana` (string): ふりがな
- `gender` (string): 性別
- `age` (number): 年齢
- `phone_number` (string): 電話番号
- `address` (string): 住所
- `media` (string): 媒体
- `route` (string): 経路
- `inflow_date` (string/date): 流入日（デフォルト: 現在日時）
- `current_company` (string): 現職
- `current_job_type` (string): 現職種
- `current_salary` (number): 現年収
- `desired_job_type` (string): 希望職種
- `desired_industry` (string): 希望業種
- `desired_salary` (number): 希望年収
- `desired_work_location` (string): 希望勤務地
- `available_time` (string): 繋がりやすい時間帯
- `initial_status` (string): 初期ステータス（デフォルト: "新規登録"）
- `priority` (string): 優先度（デフォルト: "中"）
- `assigned_staff` (string): 担当者
- `notes` (string): 備考

## リクエスト例

### cURLコマンド
```bash
curl -X POST http://localhost:5001/api/webhook/customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{
    "name": "山田太郎",
    "furigana": "やまだたろう",
    "email": "yamada@example.com",
    "phone_number": "090-1234-5678",
    "age": 30,
    "media": "Web広告",
    "route": "Google検索",
    "current_company": "ABC株式会社",
    "desired_job_type": "エンジニア",
    "priority": "高"
  }'
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:5001/api/webhook/customer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-api-key-here'
  },
  body: JSON.stringify({
    name: '山田太郎',
    furigana: 'やまだたろう',
    email: 'yamada@example.com',
    phone_number: '090-1234-5678',
    age: 30,
    media: 'Web広告',
    route: 'Google検索',
    current_company: 'ABC株式会社',
    desired_job_type: 'エンジニア',
    priority: '高'
  })
});

const result = await response.json();
console.log(result);
```

### Python (requests)
```python
import requests

url = 'http://localhost:5001/api/webhook/customer'
headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-api-key-here'
}
data = {
    'name': '山田太郎',
    'furigana': 'やまだたろう',
    'email': 'yamada@example.com',
    'phone_number': '090-1234-5678',
    'age': 30,
    'media': 'Web広告',
    'route': 'Google検索',
    'current_company': 'ABC株式会社',
    'desired_job_type': 'エンジニア',
    'priority': '高'
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## レスポンス

### 成功時 (201 Created)
```json
{
  "success": true,
  "message": "Customer created successfully via webhook",
  "data": {
    "customer_id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "status": "新規登録",
    "created_at": "2025-11-28T15:30:00.000Z"
  }
}
```

### エラーレスポンス

#### 401 Unauthorized - API Key無効
```json
{
  "success": false,
  "error": "Unauthorized: Invalid API Key"
}
```

#### 400 Bad Request - 必須フィールド不足
```json
{
  "success": false,
  "error": "Bad Request: name and email are required fields"
}
```

#### 409 Conflict - メールアドレス重複
```json
{
  "success": false,
  "error": "Conflict: Customer with this email already exists",
  "customer_id": 1
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "詳細なエラーメッセージ"
}
```

## セキュリティ

### API Keyの設定方法

1. `.env`ファイルを作成（`.env.example`をコピー）
```bash
cp .env.example .env
```

2. `.env`ファイルでAPI Keyを設定
```env
WEBHOOK_API_KEY=your-strong-secret-key-12345
```

3. 本番環境では強固なランダム文字列を使用すること

### ベストプラクティス
- API Keyは環境変数で管理し、コードにハードコードしない
- 本番環境では32文字以上のランダムな文字列を使用
- HTTPS経由でのみWebhookを受け付ける（本番環境）
- IPホワイトリストの設定を検討
- リクエストログを記録して不正アクセスを監視

## テスト方法

1. バックエンドサーバーを起動
```bash
cd backend
npm run dev
```

2. cURLでテストリクエストを送信
```bash
curl -X POST http://localhost:5001/api/webhook/customer \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{"name":"テストユーザー","email":"test@example.com"}'
```

3. CRMダッシュボードで顧客が登録されたことを確認
```
http://localhost:3000/customers
```

## トラブルシューティング

### 401 Unauthorized エラー
- API Keyが正しく設定されているか確認
- ヘッダー名が `x-api-key` になっているか確認

### 409 Conflict エラー
- 同じメールアドレスの顧客が既に存在する
- 重複を許可する場合はメールアドレスをユニークにする

### 500 Internal Server Error
- サーバーログを確認
- データベース接続を確認
- 必須フィールドが正しく送信されているか確認
