/**
 * Gmail求職者情報自動登録システム
 *
 * このスクリプトは、Gmailの特定のラベル（label:processed_to_candidates）が付いた
 * メールを監視し、Supabase Edge Functionに送信して自動的にDBに登録します。
 *
 * 設定手順：
 * 1. Google Apps Scriptエディタ（script.google.com）を開く
 * 2. 新しいプロジェクトを作成
 * 3. このコードを貼り付け
 * 4. スクリプトプロパティに以下を設定：
 *    - WEBHOOK_URL: SupabaseエッジファンクションのURL
 *    - API_KEY: 認証用APIキー
 *    - SUPABASE_ANON_KEY: Supabaseのanon public キー
 *    - PROCESSED_LABEL: 処理済みラベル名（デフォルト: processed_by_crm）
 * 5. トリガーを設定（時間ベースのトリガー: 5分ごと推奨）
 */

// スクリプトプロパティから設定を取得
const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
const SUPABASE_ANON_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY');
const PROCESSED_LABEL_NAME = PropertiesService.getScriptProperties().getProperty('PROCESSED_LABEL') || 'processed_by_crm';

/**
 * メイン処理関数
 * label:processed_to_candidates が付いているメールを取得して処理
 */
function processCandidateEmails() {
  try {
    // 設定チェック
    if (!WEBHOOK_URL || !API_KEY || !SUPABASE_ANON_KEY) {
      Logger.log('エラー: WEBHOOK_URL、API_KEY、SUPABASE_ANON_KEYを設定してください');
      return;
    }

    // ラベルを取得または作成
    const targetLabel = GmailApp.getUserLabelByName('processed_to_candidates');
    if (!targetLabel) {
      Logger.log('警告: processed_to_candidatesラベルが見つかりません');
      return;
    }

    const processedLabel = getOrCreateLabel(PROCESSED_LABEL_NAME);

    // 未処理のメールを取得
    // processed_to_candidatesラベルがあり、processed_by_crmラベルがないメール
    const query = 'label:processed_to_candidates -label:' + PROCESSED_LABEL_NAME;
    const threads = GmailApp.search(query, 0, 50); // 最大50件

    Logger.log(`${threads.length}件の未処理メールを発見`);

    let successCount = 0;
    let errorCount = 0;

    // 各スレッドを処理
    for (const thread of threads) {
      const messages = thread.getMessages();

      // スレッド内の最新メッセージを処理
      const message = messages[messages.length - 1];

      try {
        // メールをWebhookに送信
        const result = sendToWebhook(message);

        if (result.success) {
          // 成功したら処理済みラベルを追加
          thread.addLabel(processedLabel);
          successCount++;
          Logger.log(`✓ 成功: ${message.getSubject()}`);
        } else {
          errorCount++;
          Logger.log(`✗ 失敗: ${message.getSubject()} - ${result.error}`);
        }
      } catch (error) {
        errorCount++;
        Logger.log(`✗ エラー: ${message.getSubject()} - ${error.message}`);
      }

      // APIレート制限対策（処理間隔を設ける）
      Utilities.sleep(500);
    }

    Logger.log(`処理完了: 成功 ${successCount}件, 失敗 ${errorCount}件`);

  } catch (error) {
    Logger.log(`メイン処理エラー: ${error.message}`);
    Logger.log(error.stack);
  }
}

/**
 * メールをWebhookに送信
 * @param {GmailMessage} message - Gmailメッセージオブジェクト
 * @returns {Object} - 送信結果
 */
function sendToWebhook(message) {
  try {
    // メール情報を取得
    const subject = message.getSubject();
    const from = message.getFrom();
    const date = message.getDate();
    const body = message.getPlainBody(); // プレーンテキスト本文
    const htmlBody = message.getBody();   // HTML本文

    // ペイロードを作成
    const payload = {
      subject: subject,
      from: from,
      date: date.toISOString(),
      emailBody: htmlBody || body, // HTMLがあればHTML、なければプレーンテキスト
      plainBody: body,
    };

    Logger.log('送信データ:');
    Logger.log(JSON.stringify(payload, null, 2));

    // Webhookに送信
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-api-key': API_KEY,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true, // エラーレスポンスも取得
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`レスポンスコード: ${responseCode}`);
    Logger.log(`レスポンス: ${responseText}`);

    // レスポンスを解析
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { success: false, error: responseText };
    }

    // ステータスコードチェック
    if (responseCode === 201 || responseCode === 200) {
      return { success: true, data: result };
    } else if (responseCode === 409) {
      // 既に存在する場合も成功とみなす
      return { success: true, error: '既に登録済み', data: result };
    } else {
      return { success: false, error: result.error || `HTTP ${responseCode}` };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * ラベルを取得または作成
 * @param {string} labelName - ラベル名
 * @returns {GmailLabel} - Gmailラベルオブジェクト
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log(`ラベル「${labelName}」を作成しました`);
  }
  return label;
}

/**
 * テスト実行用関数
 * 手動実行してテストできます
 */
function testProcessing() {
  Logger.log('=== テスト実行開始 ===');
  Logger.log(`WEBHOOK_URL: ${WEBHOOK_URL ? '設定済み' : '未設定'}`);
  Logger.log(`API_KEY: ${API_KEY ? '設定済み' : '未設定'}`);
  Logger.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '設定済み' : '未設定'}`);
  Logger.log(`PROCESSED_LABEL: ${PROCESSED_LABEL_NAME}`);
  Logger.log('');

  processCandidateEmails();

  Logger.log('=== テスト実行完了 ===');
}

/**
 * 設定確認用関数
 */
function checkConfiguration() {
  Logger.log('=== 設定確認 ===');
  Logger.log(`WEBHOOK_URL: ${WEBHOOK_URL || '未設定 ⚠️'}`);
  Logger.log(`API_KEY: ${API_KEY || '未設定 ⚠️'}`);
  Logger.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY || '未設定 ⚠️'}`);
  Logger.log(`PROCESSED_LABEL: ${PROCESSED_LABEL_NAME}`);

  // ラベル確認
  const targetLabel = GmailApp.getUserLabelByName('processed_to_candidates');
  Logger.log(`processed_to_candidatesラベル: ${targetLabel ? '存在する ✓' : '存在しない ⚠️'}`);

  const processedLabel = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);
  Logger.log(`${PROCESSED_LABEL_NAME}ラベル: ${processedLabel ? '存在する ✓' : '存在しない（自動作成されます）'}`);

  // 未処理メール数をカウント
  const query = 'label:processed_to_candidates -label:' + PROCESSED_LABEL_NAME;
  const threads = GmailApp.search(query, 0, 1);
  Logger.log(`未処理メール数: ${threads.length > 0 ? '1件以上' : '0件'}`);

  Logger.log('=== 設定確認完了 ===');
}

/**
 * 手動でメールを1件だけテスト送信
 * 最新の未処理メール1件を送信してテスト
 */
function testSingleEmail() {
  try {
    const query = 'label:processed_to_candidates -label:' + PROCESSED_LABEL_NAME;
    const threads = GmailApp.search(query, 0, 1);

    if (threads.length === 0) {
      Logger.log('テスト対象のメールが見つかりません');
      return;
    }

    const message = threads[0].getMessages()[0];
    Logger.log(`テストメール: ${message.getSubject()}`);
    Logger.log(`送信元: ${message.getFrom()}`);

    const result = sendToWebhook(message);
    Logger.log('結果:', JSON.stringify(result, null, 2));

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
  }
}

/**
 * 全ての未処理メールを一括処理
 * 大量のメールを処理する場合に使用
 * 注意: Google Apps Scriptの実行時間制限（6分）に注意
 */
function bulkProcessAllEmails() {
  try {
    Logger.log('=== 一括処理開始 ===');

    // 設定チェック
    if (!WEBHOOK_URL || !API_KEY || !SUPABASE_ANON_KEY) {
      Logger.log('エラー: WEBHOOK_URL、API_KEY、SUPABASE_ANON_KEYを設定してください');
      return;
    }

    const targetLabel = GmailApp.getUserLabelByName('processed_to_candidates');
    if (!targetLabel) {
      Logger.log('警告: processed_to_candidatesラベルが見つかりません');
      return;
    }

    const processedLabel = getOrCreateLabel(PROCESSED_LABEL_NAME);
    const query = 'label:processed_to_candidates -label:' + PROCESSED_LABEL_NAME;

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let batchNumber = 1;

    // 全件を処理するまでループ
    while (true) {
      const threads = GmailApp.search(query, 0, 50); // 1回50件ずつ

      if (threads.length === 0) {
        Logger.log('すべてのメールを処理しました');
        break;
      }

      Logger.log(`\nバッチ ${batchNumber}: ${threads.length}件のメールを処理中...`);

      let batchSuccess = 0;
      let batchErrors = 0;

      for (const thread of threads) {
        const messages = thread.getMessages();
        const message = messages[messages.length - 1];

        try {
          const result = sendToWebhook(message);

          if (result.success) {
            thread.addLabel(processedLabel);
            batchSuccess++;
            totalSuccess++;
          } else {
            batchErrors++;
            totalErrors++;
            Logger.log(`失敗: ${message.getSubject()} - ${result.error}`);
          }
        } catch (error) {
          batchErrors++;
          totalErrors++;
          Logger.log(`エラー: ${message.getSubject()} - ${error.message}`);
        }

        totalProcessed++;

        // APIレート制限対策
        Utilities.sleep(500);
      }

      Logger.log(`バッチ ${batchNumber} 完了: 成功 ${batchSuccess}件, 失敗 ${batchErrors}件`);
      batchNumber++;

      // 実行時間制限対策（5分30秒で停止）
      if (batchNumber > 60) { // 約50分相当
        Logger.log('⚠️ 実行時間制限に達しました。再度実行して残りを処理してください。');
        break;
      }
    }

    Logger.log('\n=== 一括処理完了 ===');
    Logger.log(`合計処理数: ${totalProcessed}件`);
    Logger.log(`成功: ${totalSuccess}件`);
    Logger.log(`失敗: ${totalErrors}件`);

  } catch (error) {
    Logger.log(`一括処理エラー: ${error.message}`);
    Logger.log(error.stack);
  }
}

/**
 * 未処理メールの件数を確認
 */
function countUnprocessedEmails() {
  try {
    const query = 'label:processed_to_candidates -label:' + PROCESSED_LABEL_NAME;
    const threads = GmailApp.search(query);

    Logger.log('=== 未処理メール件数 ===');
    Logger.log(`未処理メール: ${threads.length}件`);
    Logger.log(`\n処理方法:`);
    Logger.log(`- 50件以下の場合: processCandidateEmails() を実行`);
    Logger.log(`- 50件以上の場合: bulkProcessAllEmails() を実行`);

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
  }
}
