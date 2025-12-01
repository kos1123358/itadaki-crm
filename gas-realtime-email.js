/**
 * Gmail リアルタイム通知用 GAS コード
 *
 * このコードをGoogle Apps Scriptに追加してください。
 *
 * 設定手順:
 * 1. このコードをGASプロジェクトに追加
 * 2. Gmail API を有効化（サービス → Gmail API を追加）
 * 3. setupGmailWatch() を1回実行してGmail Push通知を有効化
 * 4. Web App としてデプロイ（デプロイ → 新しいデプロイ → ウェブアプリ）
 *    - 実行者: 自分
 *    - アクセス: 全員
 * 5. デプロイURLをSupabase Secretsに設定: GAS_WEBAPP_URL=<デプロイURL>
 */

// Pub/Subトピック名（Google Cloud Console で作成したもの）
const PUBSUB_TOPIC = 'projects/nimble-autumn-448901-u2/topics/gmail-push-notifications';

/**
 * Gmail watch() を設定してPush通知を有効化
 * 最初に1回実行してください
 * watch()は7日で期限切れになるので、トリガーで定期的に更新が必要
 */
function setupGmailWatch() {
  try {
    const response = Gmail.Users.watch({
      topicName: PUBSUB_TOPIC,
      labelIds: ['INBOX']  // INBOXの新着メールのみ監視
    }, 'me');

    Logger.log('Gmail watch() 設定完了:');
    Logger.log('historyId: ' + response.historyId);
    Logger.log('expiration: ' + new Date(parseInt(response.expiration)).toISOString());

    // 期限をスクリプトプロパティに保存
    PropertiesService.getScriptProperties().setProperty('watchExpiration', response.expiration);
    PropertiesService.getScriptProperties().setProperty('lastHistoryId', response.historyId);

    return response;
  } catch (error) {
    Logger.log('Gmail watch() エラー: ' + error.message);
    throw error;
  }
}

/**
 * Gmail watch() を更新（期限切れ前に実行）
 * 毎日実行するトリガーを設定してください
 */
function renewGmailWatch() {
  const expiration = PropertiesService.getScriptProperties().getProperty('watchExpiration');

  if (expiration) {
    const expirationDate = new Date(parseInt(expiration));
    const now = new Date();
    const daysUntilExpiration = (expirationDate - now) / (1000 * 60 * 60 * 24);

    Logger.log('Watch 期限まで: ' + daysUntilExpiration.toFixed(1) + ' 日');

    // 期限まで2日未満なら更新
    if (daysUntilExpiration < 2) {
      Logger.log('Watch を更新します...');
      setupGmailWatch();
    }
  } else {
    // 初回設定
    setupGmailWatch();
  }
}

/**
 * Web App エンドポイント - Edge FunctionからのPOSTリクエストを処理
 */
function doPost(e) {
  try {
    Logger.log('=== doPost 受信 ===');

    const data = JSON.parse(e.postData.contents);
    Logger.log('受信データ: ' + JSON.stringify(data));

    // Pub/SubからのトリガーかEdge Functionからのトリガーか確認
    if (data.trigger === 'pubsub') {
      Logger.log('Pub/Sub Push通知を受信');
      Logger.log('historyId: ' + data.historyId);
      Logger.log('emailAddress: ' + data.emailAddress);

      // 新着メールを処理
      processNewEmails(data.historyId);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'メール処理完了',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '不明なトリガー'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost エラー: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 新着メールを処理（historyIdベース）
 */
function processNewEmails(historyId) {
  try {
    const lastHistoryId = PropertiesService.getScriptProperties().getProperty('lastHistoryId');

    if (!lastHistoryId) {
      Logger.log('前回のhistoryIdがありません。新しいメールを検索します...');
      // 最新のメールを1件処理
      processLatestEmail();
      return;
    }

    Logger.log('History変更を取得: startHistoryId=' + lastHistoryId);

    // Gmail History APIで変更を取得
    const history = Gmail.Users.History.list('me', {
      startHistoryId: lastHistoryId,
      historyTypes: ['messageAdded']
    });

    if (history.history && history.history.length > 0) {
      for (const record of history.history) {
        if (record.messagesAdded) {
          for (const messageAdded of record.messagesAdded) {
            const messageId = messageAdded.message.id;
            Logger.log('新着メッセージID: ' + messageId);

            // メール詳細を取得して処理
            processEmailById(messageId);
          }
        }
      }
    } else {
      Logger.log('新着メールなし');
    }

    // historyIdを更新
    if (historyId) {
      PropertiesService.getScriptProperties().setProperty('lastHistoryId', historyId);
    }

  } catch (error) {
    Logger.log('processNewEmails エラー: ' + error.message);
    // historyIdが古すぎる場合は最新メールを処理
    if (error.message.includes('historyId')) {
      Logger.log('historyIdエラー。最新メールを処理します...');
      processLatestEmail();
    }
  }
}

/**
 * 最新のメール1件を処理
 */
function processLatestEmail() {
  const threads = GmailApp.getInboxThreads(0, 1);
  if (threads.length > 0) {
    const message = threads[0].getMessages()[0];
    processGmailMessage(message);
  }
}

/**
 * メールIDから詳細を取得して処理
 */
function processEmailById(messageId) {
  try {
    const message = GmailApp.getMessageById(messageId);
    if (message) {
      processGmailMessage(message);
    }
  } catch (error) {
    Logger.log('processEmailById エラー: ' + error.message);
  }
}

/**
 * GmailMessageを処理して顧客登録
 * (既存のprocessCandidateEmailsと同様のロジック)
 */
function processGmailMessage(message) {
  try {
    const subject = message.getSubject();
    const from = message.getFrom();
    const body = message.getPlainBody();
    const date = message.getDate();

    Logger.log('--- メール処理 ---');
    Logger.log('件名: ' + subject);
    Logger.log('送信者: ' + from);
    Logger.log('日時: ' + date);

    // 候補者メールかどうか判定（特定送信元のみ）
    if (!isCandidateEmail(subject, body, from)) {
      Logger.log('対象外メールです。スキップ。');
      return;
    }

    // メール本文から情報を抽出
    const customerData = extractCustomerData(body);

    if (customerData && customerData.name) {
      // メール受信日時を流入日として追加
      customerData.inflow_date = date.toISOString();
      // 送信元から流入元を判定
      customerData.media = getMediaFromSender(from);
      Logger.log('抽出データ: ' + JSON.stringify(customerData));

      // Webhookに送信
      sendToWebhook(customerData);

      // 処理済みラベルを付ける
      const label = GmailApp.getUserLabelByName('CRM処理済み') || GmailApp.createLabel('CRM処理済み');
      message.getThread().addLabel(label);

      Logger.log('顧客登録完了: ' + customerData.name);
    }

  } catch (error) {
    Logger.log('processGmailMessage エラー: ' + error.message);
  }
}

/**
 * 候補者メールかどうか判定
 * 特定の送信元からのメールのみ処理
 */
function isCandidateEmail(subject, body, from) {
  // 対象の送信元アドレス
  const targetSenders = [
    'snapjob_ad@roxx.co.jp',
    'contact@jobseeker-navi.com'
  ];

  // 送信元が対象リストに含まれているかチェック
  if (from) {
    for (const sender of targetSenders) {
      if (from.includes(sender)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 送信元アドレスから流入元（media）を判定
 */
function getMediaFromSender(from) {
  if (from && from.includes('roxx.co.jp')) {
    return '送客NEXT';
  } else if (from && from.includes('jobseeker-navi.com')) {
    return '送客ナビ';
  }
  return 'Gmail';
}

/**
 * メール本文から顧客情報を抽出
 */
function extractCustomerData(body) {
  const data = {};

  // 名前の抽出
  const nameMatch = body.match(/(?:氏名|名前|お名前)[：:\s]*([^\n\r]+)/);
  if (nameMatch) data.name = nameMatch[1].trim();

  // メールアドレスの抽出
  const emailMatch = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];

  // 電話番号の抽出
  const phoneMatch = body.match(/(?:電話|TEL|携帯)[：:\s]*([\d\-\(\)\s]+)/i);
  if (phoneMatch) data.phone_number = phoneMatch[1].replace(/[\s\-\(\)]/g, '');

  // 年齢の抽出
  const ageMatch = body.match(/(?:年齢)[：:\s]*(\d+)/);
  if (ageMatch) data.age = parseInt(ageMatch[1]);

  // 現職の抽出
  const companyMatch = body.match(/(?:現職|会社名|勤務先)[：:\s]*([^\n\r]+)/);
  if (companyMatch) data.current_company = companyMatch[1].trim();

  return data;
}

/**
 * Webhookに顧客データを送信
 */
function sendToWebhook(customerData) {
  const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  const API_KEY = PropertiesService.getScriptProperties().getProperty('WEBHOOK_API_KEY');
  const ANON_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY');

  if (!WEBHOOK_URL) {
    Logger.log('WEBHOOK_URLが設定されていません');
    return;
  }

  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'x-api-key': API_KEY || '',
      'Authorization': 'Bearer ' + (ANON_KEY || '')
    },
    payload: JSON.stringify({
      name: customerData.name,
      email: customerData.email || '',
      phone_number: customerData.phone_number || '',
      age: customerData.age || null,
      current_company: customerData.current_company || '',
      inflow_date: customerData.inflow_date || new Date().toISOString(),
      media: customerData.media || 'Gmail',
      priority: '中'
    }),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log('Webhook応答: ' + response.getContentText());
  } catch (error) {
    Logger.log('Webhook送信エラー: ' + error.message);
  }
}

/**
 * GASのWeb AppデプロイURLを取得（Edge FunctionのSecretsに設定する用）
 */
function getWebAppUrl() {
  Logger.log('このスクリプトをWeb Appとしてデプロイしてください:');
  Logger.log('1. デプロイ → 新しいデプロイ');
  Logger.log('2. 種類: ウェブアプリ');
  Logger.log('3. 実行者: 自分');
  Logger.log('4. アクセス: 全員');
  Logger.log('');
  Logger.log('デプロイ後、URLをコピーしてSupabase Secretsに設定:');
  Logger.log('GAS_WEBAPP_URL=<デプロイURL>');
}

/**
 * Gmail watch を停止
 */
function stopGmailWatch() {
  try {
    Gmail.Users.stop('me');
    Logger.log('Gmail watch を停止しました');
  } catch (error) {
    Logger.log('Gmail watch 停止エラー: ' + error.message);
  }
}

/**
 * テスト用: 最新のメールを処理
 */
function testProcessLatestEmail() {
  processLatestEmail();
}

/**
 * 未処理のメールを一括処理
 * 「CRM処理済み」ラベルがついていないINBOXメールを処理
 * @param {number} maxCount - 処理する最大件数（デフォルト: 20）
 */
function processUnprocessedEmails(maxCount = 20) {
  Logger.log('=== 未処理メール一括処理開始 ===');

  // 「CRM処理済み」ラベルを取得または作成
  let processedLabel = GmailApp.getUserLabelByName('CRM処理済み');
  if (!processedLabel) {
    processedLabel = GmailApp.createLabel('CRM処理済み');
  }

  // INBOXの最新スレッドを取得
  const threads = GmailApp.getInboxThreads(0, maxCount);
  let processedCount = 0;
  let skippedCount = 0;

  for (const thread of threads) {
    // すでに処理済みラベルがあるかチェック
    const labels = thread.getLabels();
    const isProcessed = labels.some(label => label.getName() === 'CRM処理済み');

    if (isProcessed) {
      skippedCount++;
      continue;
    }

    // スレッド内の各メッセージを処理
    const messages = thread.getMessages();
    for (const message of messages) {
      const subject = message.getSubject();
      const body = message.getPlainBody();

      Logger.log('処理中: ' + subject);

      // 候補者メールかどうか判定
      if (isCandidateEmail(subject, body)) {
        processGmailMessage(message);
        processedCount++;
      } else {
        Logger.log('候補者メールではありません: ' + subject);
      }
    }
  }

  Logger.log('=== 処理完了 ===');
  Logger.log('処理件数: ' + processedCount);
  Logger.log('スキップ件数（処理済み）: ' + skippedCount);

  return {
    processed: processedCount,
    skipped: skippedCount
  };
}

/**
 * デバッグ版: 特定送信元からのメールを確認
 */
function debugCheckEmails() {
  Logger.log('=== デバッグ: メール内容確認 ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

  Logger.log('SUPABASE_URL: ' + (SUPABASE_URL ? '設定済み' : '未設定'));
  Logger.log('SUPABASE_SERVICE_KEY: ' + (SUPABASE_SERVICE_KEY ? '設定済み' : '未設定'));

  const targetSenders = [
    'snapjob_ad@roxx.co.jp',
    'contact@jobseeker-navi.com'
  ];

  for (const sender of targetSenders) {
    Logger.log('');
    Logger.log('=== 送信元: ' + sender + ' ===');

    const threads = GmailApp.search('from:' + sender, 0, 5); // 最初の5件のみ
    Logger.log('スレッド数: ' + threads.length);

    if (threads.length === 0) continue;

    const thread = threads[0];
    const message = thread.getMessages()[0];

    Logger.log('件名: ' + message.getSubject());
    Logger.log('受信日: ' + message.getDate());

    const body = message.getPlainBody();
    Logger.log('本文（最初の500文字）:');
    Logger.log(body.substring(0, 500));

    // メールアドレス抽出
    const allEmails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    Logger.log('');
    Logger.log('抽出されたメールアドレス: ' + JSON.stringify(allEmails));

    const customerEmails = allEmails.filter(email =>
      !email.includes('roxx.co.jp') && !email.includes('jobseeker-navi.com')
    );
    Logger.log('フィルタ後: ' + JSON.stringify(customerEmails));

    if (customerEmails.length > 0 && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      // DBで確認
      const checkResp = UrlFetchApp.fetch(
        SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerEmails[0]) + '&select=id,email,inflow_date',
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
          },
          muteHttpExceptions: true
        }
      );
      Logger.log('DB検索結果: ' + checkResp.getContentText());
    }
  }
}

/**
 * 特定送信元からのメールを処理して流入日と流入元を更新（再開可能版）
 * snapjob_ad@roxx.co.jp → 送客NEXT
 * contact@jobseeker-navi.com → 送客ナビ
 *
 * タイムアウト対策: 進捗を保存して複数回実行で完了
 * 使い方: 完了するまで繰り返し実行してください
 */
function updateInflowDatesFromSpecificSenders() {
  const START_TIME = new Date().getTime();
  const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5分（6分制限より1分余裕を持たせる）

  Logger.log('=== 特定送信元メールの流入日・流入元更新開始 ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    return;
  }

  // 進捗を読み込み
  const props = PropertiesService.getScriptProperties();
  let progress = props.getProperty('updateInflowProgress');
  progress = progress ? JSON.parse(progress) : { senderIndex: 0, threadIndex: 0, messageIndex: 0, processedEmails: [] };

  Logger.log('再開位置: sender=' + progress.senderIndex + ', thread=' + progress.threadIndex + ', message=' + progress.messageIndex);
  Logger.log('処理済みメール数: ' + progress.processedEmails.length);

  // 対象の送信元アドレスと対応する流入元名
  const senderConfig = [
    { email: 'snapjob_ad@roxx.co.jp', media: '送客NEXT', domain: 'roxx.co.jp' },
    { email: 'contact@jobseeker-navi.com', media: '送客ナビ', domain: 'jobseeker-navi.com' }
  ];

  let totalProcessed = 0;
  let totalUpdated = 0;
  let shouldStop = false;

  for (let si = progress.senderIndex; si < senderConfig.length && !shouldStop; si++) {
    const config = senderConfig[si];
    Logger.log('--- 送信元: ' + config.email + ' (流入元: ' + config.media + ') ---');

    // この送信元からの全メールを検索（最大500件）
    const searchQuery = 'from:' + config.email;
    const threads = GmailApp.search(searchQuery, 0, 500);
    Logger.log('メールスレッド数: ' + threads.length);

    const startThread = (si === progress.senderIndex) ? progress.threadIndex : 0;

    for (let ti = startThread; ti < threads.length && !shouldStop; ti++) {
      const thread = threads[ti];
      const messages = thread.getMessages();

      const startMessage = (si === progress.senderIndex && ti === progress.threadIndex) ? progress.messageIndex : 0;

      for (let mi = startMessage; mi < messages.length && !shouldStop; mi++) {
        // タイムアウトチェック
        const elapsed = new Date().getTime() - START_TIME;
        if (elapsed > MAX_RUNTIME_MS) {
          Logger.log('⏰ タイムアウト間近。進捗を保存して停止します。');
          progress.senderIndex = si;
          progress.threadIndex = ti;
          progress.messageIndex = mi;
          props.setProperty('updateInflowProgress', JSON.stringify(progress));
          shouldStop = true;
          break;
        }

        const message = messages[mi];
        const body = message.getPlainBody();
        const emailDate = message.getDate();

        // メール本文から顧客のメールアドレスを抽出（送信元ドメイン除外）
        const allEmails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const customerEmails = allEmails.filter(email =>
          !email.includes('roxx.co.jp') &&
          !email.includes('jobseeker-navi.com')
        );

        if (customerEmails.length === 0) continue;

        const customerEmail = customerEmails[0];

        // 既に処理済みならスキップ
        if (progress.processedEmails.includes(customerEmail)) {
          continue;
        }

        const inflowDate = emailDate.toISOString();  // 時刻も含める
        totalProcessed++;

        // DBを更新（流入日と流入元の両方）
        try {
          const updateResponse = UrlFetchApp.fetch(
            SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerEmail),
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              payload: JSON.stringify({
                inflow_date: inflowDate,
                media: config.media
              }),
              muteHttpExceptions: true
            }
          );

          const statusCode = updateResponse.getResponseCode();
          if (statusCode >= 200 && statusCode < 300) {
            const result = JSON.parse(updateResponse.getContentText());
            if (result && result.length > 0) {
              Logger.log('更新: ' + customerEmail + ' -> ' + inflowDate + ' / ' + config.media);
              totalUpdated++;
            }
          }

          // 処理済みとして記録
          progress.processedEmails.push(customerEmail);

        } catch (error) {
          Logger.log('エラー: ' + error.message);
        }

        // レート制限対策（500ms待機）
        Utilities.sleep(500);
      }

      // 次のスレッドに移動する際にmessageIndexをリセット
      if (!shouldStop) {
        progress.messageIndex = 0;
      }
    }

    // 次のsenderに移動する際にthread/messageIndexをリセット
    if (!shouldStop) {
      progress.threadIndex = 0;
      progress.messageIndex = 0;
    }
  }

  // 完了またはタイムアウト
  if (shouldStop) {
    Logger.log('=== 一時停止 ===');
    Logger.log('今回の処理: ' + totalProcessed + '件');
    Logger.log('今回の更新: ' + totalUpdated + '件');
    Logger.log('累計処理済み: ' + progress.processedEmails.length + '件');
    Logger.log('');
    Logger.log('⚠️ 処理が完了していません。再度実行してください。');
  } else {
    // 完了 - 進捗をクリア
    props.deleteProperty('updateInflowProgress');
    Logger.log('=== 全件処理完了 ===');
    Logger.log('総処理メール数: ' + totalProcessed);
    Logger.log('総更新成功: ' + totalUpdated + '件');
    Logger.log('累計処理済みメール: ' + progress.processedEmails.length + '件');
  }

  return {
    completed: !shouldStop,
    processedThisRun: totalProcessed,
    updatedThisRun: totalUpdated,
    totalProcessed: progress.processedEmails.length
  };
}

/**
 * 進捗をリセット（最初からやり直したい場合）
 */
function resetUpdateInflowProgress() {
  PropertiesService.getScriptProperties().deleteProperty('updateInflowProgress');
  Logger.log('進捗をリセットしました。updateInflowDatesFromSpecificSenders() を実行すると最初から処理します。');
}

/**
 * 今日受信したメールを一括処理
 */
function processTodaysEmails() {
  Logger.log('=== 今日のメール一括処理開始 ===');

  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy/MM/dd');

  // 今日のINBOXメールを検索
  const threads = GmailApp.search('in:inbox after:' + dateStr);
  let processedCount = 0;

  Logger.log('今日のメール数: ' + threads.length);

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const subject = message.getSubject();
      const body = message.getPlainBody();

      Logger.log('処理中: ' + subject);

      if (isCandidateEmail(subject, body)) {
        processGmailMessage(message);
        processedCount++;
      }
    }
  }

  Logger.log('=== 処理完了: ' + processedCount + '件 ===');
  return processedCount;
}
