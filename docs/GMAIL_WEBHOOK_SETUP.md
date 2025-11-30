# Gmail求職者情報自動登録システム セットアップガイド

このドキュメントでは、Gmailで受信した求職者情報を自動的にItadaki CRMのデータベースに登録するシステムの設定方法を説明します。

## システム概要

```
Gmail (label:processed_to_candidates)
  ↓ トリガー（5分ごと）
Google Apps Script
  ↓ Webhook (HTTPS POST)
Supabase Edge Function (gmail-candidate-webhook)
  ↓ パース＆検証
Supabase Database (customers, statuses テーブル)
```

## 前提条件

- Supabaseプロジェクトがセットアップされていること
- Gmailアカウントへのアクセス権限
- Google Apps Scriptの使用権限

---

## STEP 1: Supabase Edge Functionのデプロイ

### 1-1. 環境変数の設定

`supabase/.env.local` ファイルを開き、以下の環境変数を追加します：

```bash
# Gmail Webhook用のAPIキー（任意の強力なランダム文字列）
GMAIL_WEBHOOK_API_KEY=your-secure-random-api-key-here

# Webhook経由で登録されるデフォルトのユーザーID
# ※ auth.usersテーブルに存在するユーザーIDを指定
WEBHOOK_DEFAULT_USER_ID=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

# Supabase設定（既存の値を使用）
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**重要:**
- `GMAIL_WEBHOOK_API_KEY` は長くてランダムな文字列を生成してください（例: `openssl rand -base64 32`）
- `WEBHOOK_DEFAULT_USER_ID` は実際のauth.usersテーブルに存在するユーザーIDを指定してください

### 1-2. Edge Functionをローカルでテスト

```bash
# Edge Functionをローカルで起動
cd /Users/user/projects/itadaki/itadaki-crm
supabase functions serve gmail-candidate-webhook --env-file supabase/.env.local --no-verify-jwt
```

起動したら、別のターミナルでテスト：

```bash
curl -X POST http://localhost:54321/functions/v1/gmail-candidate-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-random-api-key-here" \
  -d '{
    "subject": "新規求職者登録",
    "from": "test@example.com",
    "emailBody": "氏名: 山田太郎\nフリガナ: ヤマダタロウ\nメール: yamada@example.com\n電話番号: 090-1234-5678\n年齢: 28\n性別: 男性\n現在の勤務先: テスト株式会社\n希望職種: エンジニア"
  }'
```

成功すると以下のようなレスポンスが返ります：

```json
{
  "success": true,
  "message": "Customer created successfully from Gmail",
  "data": {
    "customer_id": 123,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "status": "未接触",
    "created_at": "2025-11-30T12:00:00Z"
  }
}
```

### 1-3. 本番環境にデプロイ

ローカルテストが成功したら、本番環境にデプロイします：

```bash
# Supabaseにログイン（初回のみ）
supabase login

# プロジェクトにリンク（初回のみ）
supabase link --project-ref your-project-ref

# Edge Functionをデプロイ
supabase functions deploy gmail-candidate-webhook

# 本番環境の環境変数を設定
supabase secrets set GMAIL_WEBHOOK_API_KEY=your-secure-random-api-key-here
supabase secrets set WEBHOOK_DEFAULT_USER_ID=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
```

デプロイ後、Webhook URLをメモしてください：
```
https://your-project-ref.supabase.co/functions/v1/gmail-candidate-webhook
```

---

## STEP 2: Google Apps Scriptの設定

### 2-1. Google Apps Scriptプロジェクトを作成

1. https://script.google.com/ にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「Itadaki CRM Gmail Integration」などに変更

### 2-2. スクリプトを貼り付け

`docs/google-apps-script.js` の内容を全てコピーして、Google Apps Scriptエディタに貼り付けます。

### 2-3. スクリプトプロパティを設定

1. Google Apps Scriptエディタで「プロジェクトの設定」⚙️ をクリック
2. 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」をクリック
3. 以下の3つのプロパティを追加：

| プロパティ名 | 値 |
|------------|---|
| `WEBHOOK_URL` | `https://your-project-ref.supabase.co/functions/v1/gmail-candidate-webhook` |
| `API_KEY` | `your-secure-random-api-key-here`（STEP 1で設定したものと同じ） |
| `PROCESSED_LABEL` | `processed_by_crm`（処理済みメールに付けるラベル名） |

### 2-4. 権限の承認

1. エディタ上部の関数選択で `checkConfiguration` を選択
2. 「実行」ボタンをクリック
3. 権限の確認ダイアログが表示されるので、指示に従って承認
4. 実行ログで設定が正しいか確認

---

## STEP 3: Gmailラベルの作成

### 3-1. 必要なラベルを作成

Gmailで以下の2つのラベルを作成します：

1. **`processed_to_candidates`** - 求職者情報が含まれるメールに手動または自動で付けるラベル
2. **`processed_by_crm`** - CRMに登録済みのメールに自動で付けられるラベル（自動作成されます）

### 3-2. ラベルの作成手順

1. Gmailを開く
2. 左サイドバーの「もっと見る」をクリック
3. 「新しいラベルを作成」をクリック
4. ラベル名に `processed_to_candidates` と入力
5. 「作成」をクリック

---

## STEP 4: トリガーの設定

### 4-1. 時間ベースのトリガーを作成

1. Google Apps Scriptエディタで「トリガー」🕐 アイコンをクリック
2. 右下の「トリガーを追加」をクリック
3. 以下のように設定：

   - **実行する関数を選択**: `processCandidateEmails`
   - **実行するデプロイを選択**: `Head`
   - **イベントのソースを選択**: `時間主導型`
   - **時間ベースのトリガーのタイプを選択**: `分ベースのタイマー`
   - **時間の間隔を選択**: `5分おき`

4. 「保存」をクリック

これで、5分ごとに自動的に `processCandidateEmails` 関数が実行されます。

---

## STEP 5: 既存メールの一括処理（オプション）

既に`processed_to_candidates`ラベルが付いているメールを一括処理する場合：

### 5-1. 未処理メール件数の確認

Google Apps Scriptエディタで：

1. 関数選択で `countUnprocessedEmails` を選択
2. 「実行」をクリック
3. 実行ログで未処理メール件数を確認

### 5-2. メールの一括処理

**50件以下の場合:**
1. 関数選択で `processCandidateEmails` を選択
2. 「実行」をクリック

**50件以上の場合:**
1. 関数選択で `bulkProcessAllEmails` を選択
2. 「実行」をクリック
3. 実行ログで進捗を確認
4. Google Apps Scriptの実行時間制限（6分）により途中で停止した場合は、再度実行して残りを処理

**注意事項:**
- `bulkProcessAllEmails`は1回50件ずつ処理します
- 各メールの処理間隔は500msです（APIレート制限対策）
- 処理済みメールには自動的に`processed_by_crm`ラベルが付きます
- 重複エラー（既に登録済み）の場合も処理済みラベルが付きます

---

## STEP 6: テスト

### 6-1. テストメールの準備

1. Gmailで新しいメールを作成（または既存のメールを使用）
2. メール本文に以下のような形式で求職者情報を記載：

```
氏名: テスト太郎
フリガナ: テストタロウ
メール: test-candidate@example.com
電話番号: 080-1234-5678
年齢: 30
性別: 男性
住所: 東京都渋谷区
現在の勤務先: サンプル株式会社
現在の職種: 営業
現在の年収: 500
希望職種: マーケティング
希望業種: IT・Web
希望年収: 600
希望勤務地: 東京都
面談可能時間: 平日19時以降
```

3. メールに `processed_to_candidates` ラベルを付ける

### 6-2. 手動テスト実行

Google Apps Scriptエディタで：

1. 関数選択で `testSingleEmail` を選択
2. 「実行」をクリック
3. 実行ログを確認

成功すると以下のようなログが表示されます：

```
テストメール: 新規求職者登録
送信元: xxx@gmail.com
結果: {
  "success": true,
  "data": {
    "customer_id": 123,
    "name": "テスト太郎",
    "email": "test-candidate@example.com"
  }
}
```

### 6-3. データベース確認

Supabaseのダッシュボードまたはローカルデータベースで確認：

```sql
-- 最新の顧客データを確認
SELECT * FROM customers ORDER BY created_at DESC LIMIT 1;

-- ステータスも確認
SELECT c.name, c.email, s.current_status, s.priority
FROM customers c
LEFT JOIN statuses s ON c.id = s.customer_id
ORDER BY c.created_at DESC
LIMIT 1;
```

---

## トラブルシューティング

### エラー: "Invalid API Key"

- Google Apps ScriptのスクリプトプロパティでAPI_KEYが正しく設定されているか確認
- Supabaseの環境変数 `GMAIL_WEBHOOK_API_KEY` と一致しているか確認

### エラー: "Could not extract required fields"

- メール本文のフォーマットを確認
- 最低限、「氏名」と「メール」フィールドが必要
- Edge Function の `parseEmailContent` 関数のパターンを調整

### エラー: "WEBHOOK_DEFAULT_USER_ID not configured"

- Supabaseの環境変数 `WEBHOOK_DEFAULT_USER_ID` が設定されているか確認
- 指定したユーザーIDが `auth.users` テーブルに存在するか確認

### メールが処理されない

1. Google Apps Scriptのトリガーが正しく設定されているか確認
2. `processed_to_candidates` ラベルが正しく付いているか確認
3. Google Apps Scriptの実行ログでエラーを確認

### 重複エラー: "Customer with this email already exists"

- これは正常な動作です（同じメールアドレスの顧客は登録されません）
- 処理済みラベルは付きます

---

## メール本文フォーマットのカスタマイズ

メール本文のフォーマットが異なる場合、Edge Function の `parseEmailContent` 関数を修正してください。

`supabase/functions/gmail-candidate-webhook/index.ts` の `patterns` オブジェクトを編集：

```typescript
const patterns = {
  name: /(?:氏名|名前|お名前|Name)[：:\s]*([^\n]+)/i,
  email: /(?:メール|Email|E-mail)[：:\s]*([^\s\n]+@[^\s\n]+)/i,
  // ... その他のパターン
}
```

修正後、再デプロイが必要です：

```bash
supabase functions deploy gmail-candidate-webhook
```

---

## 運用時の注意事項

1. **APIレート制限**: Google Apps Scriptは1日のメール処理数に制限があります（通常、1日1,500通程度）
2. **ラベル管理**: `processed_by_crm` ラベルが付いたメールは再処理されません
3. **エラー通知**: 定期的にGoogle Apps Scriptの実行ログを確認することを推奨
4. **セキュリティ**: API_KEYは絶対に公開しないでください

---

## サポート

問題が発生した場合は、以下を確認してください：

1. Google Apps Scriptの実行ログ
2. Supabase Edge Functionのログ（Supabaseダッシュボード → Functions → Logs）
3. Supabaseデータベースの `customers` と `statuses` テーブル

実際のメール形式のサンプルを提供いただければ、より正確なパーサーにカスタマイズできます。
