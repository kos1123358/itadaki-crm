# Gmail自動インポート設定手順

## 問題の原因

HTTP 401エラー「Missing authorization header」が発生していました。

**原因:** Supabase Edge Functionsは、デフォルトで`Authorization`ヘッダー（Supabase anon key）を必要としますが、Google Apps Scriptは`x-api-key`ヘッダーのみを送信していました。

## 解決方法

Google Apps Scriptのコードを修正し、両方のヘッダーを送信するようにしました。

## 設定手順

### 1. Supabase anon keyを取得

1. Supabaseダッシュボードを開く: https://supabase.com/dashboard/project/xstdcpmlkahgvmpbavhq/settings/api
2. 「Project API keys」セクションで**anon public**キーをコピー
   - `eyJhbG...` で始まる長い文字列です

### 2. Google Apps Scriptプロジェクトを開く

1. https://script.google.com/home/projects/1peAvqXBv9Oqz2hloE659_OyD_bcsNUDVHluPkxGZ0KJTVmCfHl9XXlKG/edit にアクセス

### 3. 最新のコードに更新

1. エディタで全てのコードを選択して削除
2. `/Users/user/projects/itadaki/itadaki-crm/docs/google-apps-script.js` の内容をコピー＆ペースト
3. 「保存」アイコンをクリック

### 4. SUPABASE_ANON_KEYを追加

1. 「プロジェクトの設定」⚙️をクリック
2. 「スクリプト プロパティ」セクションまでスクロール
3. 「プロパティを追加」をクリック
4. 以下を入力：
   - **プロパティ**: `SUPABASE_ANON_KEY`
   - **値**: （手順1でコピーしたanon publicキー）
5. 「スクリプト プロパティを保存」をクリック

### 5. 設定を確認

1. エディタに戻る
2. 関数ドロップダウンから`checkConfiguration`を選択
3. 「実行」をクリック
4. 実行ログで以下が全て「設定済み」になっていることを確認：
   ```
   WEBHOOK_URL: 設定済み
   API_KEY: 設定済み
   SUPABASE_ANON_KEY: 設定済み ✓
   ```

### 6. テスト実行

1. 関数ドロップダウンから`testSingleEmail`を選択
2. 「実行」をクリック
3. 実行ログで成功メッセージを確認：
   ```
   レスポンスコード: 201
   ✓ 成功: [メールの件名]
   ```

### 7. 一括処理を実行

テストが成功したら、全247件のメールをインポート：

1. 関数ドロップダウンから`bulkProcessAllEmails`を選択
2. 「実行」をクリック
3. 処理が完了するまで待つ（数分かかります）
4. 実行ログで結果を確認：
   ```
   === 一括処理完了 ===
   合計処理数: 247件
   成功: 247件
   失敗: 0件
   ```

## 確認

処理完了後、Supabaseで確認：

1. https://supabase.com/dashboard/project/xstdcpmlkahgvmpbavhq/editor にアクセス
2. `customers`テーブルを選択
3. 247件のレコードが登録されていることを確認

## トラブルシューティング

### エラー: Invalid JWT

SUPABASE_ANON_KEYが正しくありません。手順1で正しいanon publicキーをコピーしたか確認してください。

### エラー: Missing authorization header（まだ出る場合）

1. Google Apps Scriptのコードが最新版に更新されているか確認
2. SUPABASE_ANON_KEYが正しく設定されているか確認（スペルミスがないか）
3. ページをリフレッシュして再度実行

### 実行時間制限に達しました

Google Apps Scriptには6分の実行時間制限があります。`bulkProcessAllEmails`を再度実行すれば、未処理のメールから続きを処理します。

## 完了後

一括処理が完了したら、定期実行トリガーを設定して新着メールを自動処理できます：

1. Google Apps Scriptエディタで「トリガー」⏰をクリック
2. 「トリガーを追加」
3. 設定：
   - 実行する関数: `processCandidateEmails`
   - イベントのソース: 時間主導型
   - 時間ベースのトリガー: 分ベースのタイマー
   - 時間の間隔: 5分おき
4. 「保存」

これで、5分ごとに新着メールが自動的にSupabaseに登録されます。
