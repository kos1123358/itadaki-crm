# Itadaki CRM - デプロイメント・開発フローガイド

## 🚨 重要: デプロイベース開発フロー

**このプロジェクトはデプロイベースの開発フローを採用しています。**

### なぜローカル開発ではダメなのか

- **インテグレーション検証ができない**: ローカル環境ではVercel、Supabase、Google Apps Script (GAS) の実環境での連携を検証できません
- **環境差異によるバグ**: ローカルとプロダクション環境の差異により、デプロイ後に問題が発生するリスクがあります
- **外部サービス連携**: GASからのWebhook連携など、外部サービスとの統合テストはデプロイ環境でのみ可能です

### 推奨開発フロー

```
1. コード変更
   ↓
2. Git commit
   ↓
3. Vercelへデプロイ
   ↓
4. 本番環境で動作確認・統合テスト
   ↓
5. 問題があれば修正して1に戻る
```

**AIエージェントへの注意**: ローカルで開発を進めようとせず、必ずデプロイして本番環境で確認してください。

---

## 📊 現在のデプロイ状況

### ✅ Vercel (フロントエンド)

**ステータス**: デプロイ済み

- **本番URL（固定）**: https://frontend-self-one-79.vercel.app
- **管理画面**: https://vercel.com/kos1123358s-projects/frontend
- **プロジェクト名**: frontend
- **最終デプロイ**: 2025-12-01
- **デプロイ方法**: Vercel CLI + APIトークン

> **注意**: `vercel deploy --prod`でデプロイすると、固定の本番URLに反映されます。
> CLIに表示される`frontend-{hash}-...`のURLは各デプロイ固有のもので、履歴確認やロールバック用です。

#### 必要な環境変数設定

現在、ローカルSupabase環境の設定になっているため、以下を設定する必要があります：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### ⚠️ Supabase (バックエンド)

**ステータス**: 本番プロジェクトの作成・設定が必要

#### 必要な作業

1. **Supabaseプロジェクトの作成**
   - https://app.supabase.com でプロジェクト作成
   - リージョン: Northeast Asia (Tokyo) 推奨

2. **データベーススキーマの適用**
   ```bash
   # SQL Editorで supabase-schema.sql を実行
   ```

3. **環境変数の取得**
   - Project URL
   - anon public key
   - service_role key (Webhook用)

4. **Webhook API用のSecretsを設定**
   ```bash
   # APIキーを生成
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Supabase Secretsに設定
   supabase secrets set WEBHOOK_API_KEY=生成したキー
   supabase secrets set WEBHOOK_DEFAULT_USER_ID=ユーザーID
   ```

5. **Edge Functionのデプロイ**
   ```bash
   supabase functions deploy webhook-customer
   ```

### 📝 Google Apps Script (GAS) 連携

**ステータス**: 設定待ち

GASはWebhook APIを通じて顧客データを自動登録します。

#### GAS連携の実装例

```javascript
// Google Apps Script
function submitCustomerToItadakiCRM(customerData) {
  const WEBHOOK_URL = 'https://your-project-ref.supabase.co/functions/v1/webhook-customer';
  const API_KEY = 'your-webhook-api-key';
  const ANON_KEY = 'your-supabase-anon-key';

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'Authorization': 'Bearer ' + ANON_KEY
    },
    payload: JSON.stringify({
      name: customerData.name,
      email: customerData.email,
      phone_number: customerData.phone,
      age: customerData.age,
      gender: customerData.gender,
      current_company: customerData.company,
      current_position: customerData.position,
      desired_position: customerData.desiredPosition,
      media: customerData.source || 'Googleフォーム',
      priority: customerData.priority || '中'
    })
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const result = JSON.parse(response.getContentText());
    Logger.log('Success: ' + result.message);
    return result;
  } catch (error) {
    Logger.log('Error: ' + error.message);
    throw error;
  }
}

// Googleフォーム送信時のトリガー
function onFormSubmit(e) {
  const responses = e.values;
  const customerData = {
    name: responses[1],
    email: responses[2],
    phone: responses[3],
    age: responses[4],
    gender: responses[5],
    company: responses[6],
    position: responses[7],
    desiredPosition: responses[8],
    source: 'Googleフォーム',
    priority: '中'
  };

  submitCustomerToItadakiCRM(customerData);
}
```

#### GASトリガーの設定

1. Google Apps Scriptエディタを開く
2. 「トリガー」→「トリガーを追加」
3. 関数: `onFormSubmit`
4. イベントソース: フォームから
5. イベントタイプ: フォーム送信時

---

## 🚀 デプロイ手順

### 1. Supabase本番環境のセットアップ

```bash
# Supabaseにログイン
supabase login

# 新規プロジェクトを作成（ブラウザで）
# https://app.supabase.com

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# データベーススキーマを適用
# Supabase Dashboard → SQL Editor で supabase-schema.sql を実行

# Webhook用のSecretsを設定
supabase secrets set WEBHOOK_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
supabase secrets set WEBHOOK_DEFAULT_USER_ID=your-user-id

# Edge Functionをデプロイ
supabase functions deploy webhook-customer
```

### 2. Vercelに環境変数を設定

```bash
# Vercelにログイン（トークン使用）
export VERCEL_TOKEN=your-vercel-token

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 値を入力: https://your-project-ref.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 値を入力: your-supabase-anon-key
```

または、Vercel Dashboard（https://vercel.com/kos1123358s-projects/frontend/settings/environment-variables）で設定：

1. Settings → Environment Variables
2. `NEXT_PUBLIC_SUPABASE_URL` を追加
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` を追加
4. Environment: `Production`, `Preview`, `Development` すべて選択

### 3. フロントエンドを再デプロイ

```bash
cd frontend

# Vercelにデプロイ
vercel deploy --token=your-vercel-token --prod
```

### 4. 動作確認

1. **フロントエンドにアクセス**
   - https://frontend-self-one-79.vercel.app

2. **ユーザー登録・ログイン**
   - `/signup` でアカウント作成
   - `/login` でログイン

3. **顧客登録テスト**
   - `/customers` で新規顧客登録

4. **Webhook APIテスト**
   ```bash
   curl -X POST https://your-project-ref.supabase.co/functions/v1/webhook-customer \
     -H "Content-Type: application/json" \
     -H "x-api-key: your-webhook-api-key" \
     -H "Authorization: Bearer your-supabase-anon-key" \
     -d '{
       "name": "テストユーザー",
       "email": "test@example.com",
       "phone_number": "090-1234-5678"
     }'
   ```

5. **GAS連携テスト**
   - Googleフォームから送信
   - CRMに顧客が自動登録されることを確認

---

## 🔄 継続的デプロイフロー

### コード変更からデプロイまで

```bash
# 1. コード変更
# frontend/app/... などを編集

# 2. Git commit（推奨）
git add .
git commit -m "機能追加: XXX"

# 3. Vercelにデプロイ
cd frontend
vercel deploy --token=your-vercel-token --prod

# 4. デプロイURLで動作確認
# Production URL が表示されるのでブラウザで確認

# 5. 問題があれば修正して再度デプロイ
```

### Supabase Edge Functionの更新

```bash
# 1. Edge Functionのコードを編集
# supabase/functions/webhook-customer/index.ts

# 2. デプロイ
supabase functions deploy webhook-customer

# 3. ログで確認
supabase functions logs webhook-customer --tail

# 4. テストリクエスト送信
curl -X POST ...
```

---

## 🔐 必要な認証情報・キー

### Vercel
- APIトークン: `bUS5VfswQiN03xkgbcwgnbPl`
- プロジェクトURL: https://vercel.com/kos1123358s-projects/frontend

### Supabase（設定後に記録）
- Project Ref: `___________`
- Project URL: `https://____________.supabase.co`
- Anon Key: `___________`
- Service Role Key: `___________`（Edge Function用）
- Webhook API Key: `___________`

### Google Apps Script
- Webhook URL: `https://____________.supabase.co/functions/v1/webhook-customer`

---

## 📋 チェックリスト

### Supabase本番環境
- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ適用（supabase-schema.sql）
- [ ] 認証設定（Email Provider有効化）
- [ ] Webhook API Key設定
- [ ] Default User ID設定
- [ ] Edge Function デプロイ
- [ ] Edge Function 動作確認

### Vercel本番環境
- [x] プロジェクトデプロイ
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 設定
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 設定
- [ ] 環境変数設定後の再デプロイ
- [ ] 本番URLでログイン確認
- [ ] 顧客登録機能確認

### GAS連携
- [ ] GASスクリプト作成
- [ ] Webhook URL設定
- [ ] API Key設定
- [ ] フォームトリガー設定
- [ ] テスト送信・動作確認

---

## 🐛 トラブルシューティング

### Vercelデプロイエラー

```bash
# ビルドログを確認
vercel logs --token=your-vercel-token

# 環境変数を確認
vercel env ls --token=your-vercel-token
```

### Supabase接続エラー

1. ブラウザのコンソールでエラー確認
2. Supabase Dashboard → Settings → API で認証情報確認
3. 環境変数が正しく設定されているか確認

### Webhook APIエラー

```bash
# Edge Functionのログを確認
supabase functions logs webhook-customer

# 環境変数を確認
supabase secrets list
```

### GAS連携エラー

1. GASのログを確認（Ctrl/Cmd + Enter）
2. Webhook URLが正しいか確認
3. API Keyが正しいか確認
4. CORS設定を確認（Edge FunctionでCORS許可済み）

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabaseセットアップ詳細
- [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) - Webhook API詳細
- [Vercel Dashboard](https://vercel.com/kos1123358s-projects/frontend)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🎯 次のステップ

1. **Supabase本番環境の構築**
   - プロジェクト作成
   - スキーマ適用
   - Edge Functionデプロイ

2. **Vercel環境変数の設定**
   - Supabase接続情報を設定
   - 再デプロイ

3. **GAS連携の実装**
   - スクリプト作成
   - トリガー設定
   - テスト実施

4. **本番環境での動作確認**
   - ユーザー登録・ログイン
   - 顧客管理機能
   - Webhook経由の顧客登録
   - 統合テスト
