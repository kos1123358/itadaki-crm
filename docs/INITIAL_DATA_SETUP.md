# Gmailラベル付きメールから初期データ作成

## 概要

既存のGmailメールから候補者データを一括で取り込み、Supabaseに初期データとして登録する手順です。

## 前提条件

- Google Apps Scriptプロジェクトが設定済み
- Supabase Edge Function（gmail-candidate-webhook）がデプロイ済み
- スクリプトプロパティが設定済み：
  - `WEBHOOK_URL`: https://xstdcpmlkahgvmpbavhq.supabase.co/functions/v1/gmail-candidate-webhook
  - `API_KEY`: 設定済みのAPIキー
  - `SUPABASE_ANON_KEY`: Supabaseのanon publicキー
  - `PROCESSED_LABEL`: processed_by_crm（任意）

## 手順

### 1. Gmailでラベルを作成

1. Gmailを開く
2. 設定 > ラベル > 新しいラベルを作成
3. ラベル名: `processed_to_candidates`

### 2. 候補者メールにラベルを付ける

#### 方法A: 手動で個別に付ける
1. 候補者からのメールを開く
2. ラベルアイコンをクリック
3. `processed_to_candidates` を選択

#### 方法B: 検索して一括で付ける
1. Gmailの検索バーで候補者メールを検索
   ```
   例: subject:(応募) OR subject:(求人) OR subject:(転職)
   ```
2. 検索結果で「すべて選択」をクリック
3. ラベルアイコンをクリック
4. `processed_to_candidates` を選択

### 3. Google Apps Scriptで一括処理を実行

#### ステップ1: スクリプトエディタを開く
1. https://script.google.com にアクセス
2. 「Itadaki CRM Gmail Integration」プロジェクトを開く

#### ステップ2: 処理対象メール数を確認
1. `countPendingEmails()` 関数を選択
2. 「実行」ボタンをクリック
3. ログで処理対象メール数を確認

#### ステップ3: 一括処理を実行

**50件以下の場合:**
```javascript
processCandidateEmails()
```
- 関数を選択して「実行」をクリック

**50件以上の場合:**
```javascript
bulkProcessAllEmails()
```
- 関数を選択して「実行」をクリック
- 最大3000件まで一度に処理可能
- 実行時間制限により途中で停止した場合は再度実行

#### ステップ4: 処理結果を確認
1. 実行ログで成功/失敗件数を確認
2. Supabaseダッシュボードで顧客データを確認
   - https://supabase.com/dashboard/project/xstdcpmlkahgvmpbavhq
   - Table Editor > customers

### 4. 処理済みメールの確認

処理が完了したメールには自動的に `processed_by_crm` ラベルが付きます。

Gmailで確認:
```
label:processed_to_candidates label:processed_by_crm
```

## トラブルシューティング

### エラー: WEBHOOK_URL、API_KEY、SUPABASE_ANON_KEYを設定してください

スクリプトプロパティを設定：
1. Google Apps Scriptエディタで「プロジェクトの設定」⚙️をクリック
2. 「スクリプト プロパティ」セクションで「プロパティを追加」
3. 以下を追加：
   - `WEBHOOK_URL`: https://xstdcpmlkahgvmpbavhq.supabase.co/functions/v1/gmail-candidate-webhook
   - `API_KEY`: Supabaseの`GMAIL_WEBHOOK_API_KEY`シークレット値
   - `SUPABASE_ANON_KEY`: Supabaseのanon publicキー（https://supabase.com/dashboard/project/xstdcpmlkahgvmpbavhq/settings/api から取得）

### エラー: processed_to_candidatesラベルが見つかりません

Gmailで `processed_to_candidates` ラベルを作成してください。

### メール解析に失敗する

メールの本文から情報を抽出できない場合：
1. `testSingleEmail()` 関数でテスト
2. ログで抽出結果を確認
3. 必要に応じてメール本文のフォーマットを調整

### 実行時間制限に達しました

Google Apps Scriptには実行時間制限（約6分）があります：
- `bulkProcessAllEmails()` を再度実行
- 未処理のメールから続きを処理します

## 定期実行設定

初期データ作成後、新着メールを自動処理するにはトリガーを設定：

1. Google Apps Scriptエディタで「トリガー」⏰をクリック
2. 「トリガーを追加」
3. 設定：
   - 実行する関数: `processCandidateEmails`
   - イベントのソース: 時間主導型
   - 時間ベースのトリガー: 分ベースのタイマー
   - 時間の間隔: 5分おき
4. 「保存」

## 登録されるデータ

以下の情報が自動的に抽出され、Supabaseに登録されます：

- 名前
- ふりがな
- メールアドレス
- 電話番号
- 年齢
- 性別
- 住所
- 現職・現職種・現年収
- 希望職種・希望業種・希望年収・希望勤務地
- 転職理由
- 連絡可能時間
- データ流入日
- 媒体・経路

抽出できなかった項目は空白のまま登録され、後から手動で編集できます。

## 参考

- Google Apps Script コード: `/docs/google-apps-script.js`
- Edge Function: `/supabase/functions/gmail-candidate-webhook/index.ts`
- Webhook設定: `/docs/WEBHOOK_SETUP.md`
