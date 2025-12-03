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

    // Admin操作用トリガー
    if (data.trigger === 'admin') {
      Logger.log('Admin操作: ' + data.action);

      if (data.action === 'resetReprocessProgress') {
        resetReprocessRoxxProgress();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: '進捗リセット完了'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (data.action === 'reprocessAllRoxxEmails') {
        const result = reprocessAllRoxxEmails();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'バッチ処理実行',
          result: result
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (data.action === 'checkReprocessProgress') {
        const progress = checkReprocessRoxxProgress();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          progress: progress
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: '不明なadminアクション: ' + data.action
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
      // 送信元から流入元を判定（転送メール対応）
      customerData.media = getMediaFromSender(from, body);
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
 * 転送メールの場合は本文内の元送信者もチェック
 * 件名に特定のキーワードが含まれる場合も対象
 */
function isCandidateEmail(subject, body, from) {
  Logger.log('[isCandidateEmail] 判定開始');
  Logger.log('[isCandidateEmail] 件名: ' + subject);
  Logger.log('[isCandidateEmail] 送信者: ' + from);

  // 対象の送信元アドレス/ドメイン
  const targetSenders = [
    'snapjob_ad@roxx.co.jp',
    'snapjob@roxx.co.jp',
    'roxx.co.jp',  // ドメイン全体も対象
    'contact@jobseeker-navi.com',
    'jobseeker-navi.com',  // ドメイン全体も対象
    'itadaki-career.com'  // 転送元
  ];

  // 件名に対象キーワードが含まれるかチェック
  const targetSubjectKeywords = [
    '送客NEXT',
    '送客ナビ',
    'Zキャリア',
    '求職者応募通知'
  ];

  // 件名チェック（大文字小文字を区別しない、全角半角両対応）
  if (subject) {
    const normalizedSubject = subject.toLowerCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    Logger.log('[isCandidateEmail] 正規化後の件名: ' + normalizedSubject);

    for (const keyword of targetSubjectKeywords) {
      const normalizedKeyword = keyword.toLowerCase()
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

      if (normalizedSubject.includes(normalizedKeyword)) {
        Logger.log('[isCandidateEmail] ✓ 件名キーワード検出: ' + keyword);
        return true;
      }
    }
    Logger.log('[isCandidateEmail] 件名キーワードなし');
  }

  // 送信元が対象リストに含まれているかチェック
  if (from) {
    for (const sender of targetSenders) {
      if (from.includes(sender)) {
        Logger.log('[isCandidateEmail] ✓ 送信元一致: ' + sender);
        return true;
      }
    }
    Logger.log('[isCandidateEmail] 送信元不一致');
  }

  // 転送メールの場合：本文内に元の送信者情報があるかチェック
  if (body) {
    for (const sender of targetSenders) {
      // 転送メールでよくあるパターン: "From: xxx@roxx.co.jp" や "差出人: xxx@roxx.co.jp"
      if (body.includes(sender)) {
        Logger.log('[isCandidateEmail] ✓ 転送メール検出: 本文内に ' + sender + ' を発見');
        return true;
      }
    }
    Logger.log('[isCandidateEmail] 本文内にも対象ドメインなし');
  }

  Logger.log('[isCandidateEmail] ✗ 候補者メールではない');
  return false;
}

/**
 * 送信元アドレスから流入元（media）を判定
 * 転送メールの場合は本文からも判定
 */
function getMediaFromSender(from, body) {
  // まずFromヘッダーをチェック
  if (from) {
    if (from.includes('roxx.co.jp')) {
      return '送客NEXT';
    } else if (from.includes('jobseeker-navi.com')) {
      return '送客ナビ';
    }
  }

  // 転送メールの場合：本文から判定
  if (body) {
    if (body.includes('roxx.co.jp') || body.includes('snapjob')) {
      return '送客NEXT';
    } else if (body.includes('jobseeker-navi.com')) {
      return '送客ナビ';
    }
  }

  return 'Gmail';
}

/**
 * メール本文から顧客情報を抽出
 * roxx (Zキャリア/送客NEXT) メールのフォーマットに完全対応
 */
function extractCustomerData(body) {
  const data = {};

  // HTMLタグを除去するヘルパー
  const removeHtml = (str) => str.replace(/<[^>]*>/g, '').trim();

  // 名前の抽出（氏名：の後、改行または<br>まで）
  const nameMatch = body.match(/(?:氏名|名前|お名前)[：:\s]*([^\n\r<]+)/);
  if (nameMatch) data.name = removeHtml(nameMatch[1].trim());

  // ふりがなの抽出
  const furiganaMatch = body.match(/(?:ふりがな|フリガナ)[：:\s]*([^\n\r<]+)/);
  if (furiganaMatch) data.furigana = removeHtml(furiganaMatch[1].trim());

  // 性別の抽出
  const genderMatch = body.match(/(?:性別)[：:\s]*(男性|女性|その他)/);
  if (genderMatch) data.gender = genderMatch[1];

  // メールアドレスの抽出（roxx.co.jp, jobseeker-navi.com, itadaki-career.com を除外）
  const allEmails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const customerEmail = allEmails.find(email =>
    !email.includes('roxx.co.jp') &&
    !email.includes('jobseeker-navi.com') &&
    !email.includes('itadaki-career.com') &&
    !email.includes('agent-bank.com')
  );
  if (customerEmail) data.email = customerEmail;

  // 電話番号の抽出（複数パターン対応）
  // パターン1: 「電話番号：09033230208」形式
  const phoneMatch1 = body.match(/(?:電話番号|電話|TEL|携帯)[：:\s]*(\d{10,11})/i);
  if (phoneMatch1) {
    data.phone_number = phoneMatch1[1];
  } else {
    // パターン2: 「電話：090-3323-0208」形式（ハイフン付き）
    const phoneMatch2 = body.match(/(?:電話番号|電話|TEL|携帯)[：:\s]*([\d\-]{12,13})/i);
    if (phoneMatch2) {
      data.phone_number = phoneMatch2[1].replace(/-/g, '');
    }
  }

  // 年齢の抽出（「27歳」形式にも対応）
  const ageMatch = body.match(/(?:年齢)[：:\s]*(\d+)(?:歳)?/);
  if (ageMatch) data.age = parseInt(ageMatch[1]);

  // 希望勤務地の抽出
  const desiredLocationMatch = body.match(/(?:希望勤務地)[：:\s]*([^\n\r<]+)/);
  if (desiredLocationMatch) data.desired_work_location = removeHtml(desiredLocationMatch[1].trim());

  // 希望職種の抽出
  const desiredJobMatch = body.match(/(?:希望職種)[：:\s]*([^\n\r<]+)/);
  if (desiredJobMatch) data.desired_job_type = removeHtml(desiredJobMatch[1].trim());

  // 最終学歴の抽出
  const educationMatch = body.match(/(?:最終学歴)[：:\s]*([^\n\r<]+)/);
  if (educationMatch) data.final_education = removeHtml(educationMatch[1].trim());

  // 就業開始までの期間の抽出
  const startPeriodMatch = body.match(/(?:就業開始までの期間)[：:\s]*([^\n\r<]+)/);
  if (startPeriodMatch) data.employment_start_period = removeHtml(startPeriodMatch[1].trim());

  // 現在の就業形態の抽出
  const employmentTypeMatch = body.match(/(?:現在の就業形態)[：:\s]*([^\n\r<]+)/);
  if (employmentTypeMatch) data.current_job_type = removeHtml(employmentTypeMatch[1].trim());

  // 自動車免許の有無の抽出
  const licenseMatch = body.match(/(?:自動車免許の有無)[：:\s]*(はい|いいえ|あり|なし|有|無)/);
  if (licenseMatch) {
    const licenseValue = licenseMatch[1];
    data.drivers_license = (licenseValue === 'はい' || licenseValue === 'あり' || licenseValue === '有');
  }

  // 現職・会社名の抽出（roxxメールでは通常含まれないが念のため）
  const companyMatch = body.match(/(?:現職|会社名|勤務先)[：:\s]*([^\n\r<]+)/);
  if (companyMatch) data.current_company = removeHtml(companyMatch[1].trim());

  // 住所の抽出（含まれる場合）
  const addressMatch = body.match(/(?:住所)[：:\s]*([^\n\r<]+)/);
  if (addressMatch) data.address = removeHtml(addressMatch[1].trim());

  // 希望年収の抽出（「400万円」「400〜500万円」形式）
  const salaryMatch = body.match(/(?:希望年収)[：:\s]*(\d+)(?:〜|～|-)?(\d+)?(?:万円)?/);
  if (salaryMatch) {
    if (salaryMatch[2]) {
      // 範囲指定の場合は上限値を採用
      data.desired_salary = parseInt(salaryMatch[2]) * 10000;
    } else {
      data.desired_salary = parseInt(salaryMatch[1]) * 10000;
    }
  }

  // 面談可能時間/繋がり易い時間帯の抽出
  const availableTimeMatch = body.match(/(?:繋がり易い時間帯|面談可能時間|連絡可能時間)[：:\s]*([^\n\r<]+)/);
  if (availableTimeMatch) data.available_time = removeHtml(availableTimeMatch[1].trim());

  return data;
}

/**
 * Webhookに顧客データを送信（Webhook失敗時は直接DB登録にフォールバック）
 */
function sendToWebhook(customerData) {
  const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  const API_KEY = PropertiesService.getScriptProperties().getProperty('WEBHOOK_API_KEY');
  const ANON_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY');

  const payload = {
    name: customerData.name,
    email: customerData.email || '',
    furigana: customerData.furigana || '',
    gender: customerData.gender || '',
    phone_number: customerData.phone_number || '',
    age: customerData.age || null,
    address: customerData.address || '',
    desired_work_location: customerData.desired_work_location || '',
    desired_job_type: customerData.desired_job_type || '',
    desired_salary: customerData.desired_salary || null,
    final_education: customerData.final_education || '',
    employment_start_period: customerData.employment_start_period || '',
    current_job_type: customerData.current_job_type || '',
    current_company: customerData.current_company || '',
    drivers_license: customerData.drivers_license !== undefined ? customerData.drivers_license : null,
    available_time: customerData.available_time || '',
    inflow_date: customerData.inflow_date || new Date().toISOString(),
    media: customerData.media || 'Gmail',
    priority: '中'
  };

  // まずWebhookを試す
  if (WEBHOOK_URL) {
    const options = {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'x-api-key': API_KEY || '',
        'Authorization': 'Bearer ' + (ANON_KEY || '')
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
      const responseText = response.getContentText();
      Logger.log('Webhook応答: ' + responseText);

      // 成功した場合は終了
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        const result = JSON.parse(responseText);
        if (result.success) {
          return;
        }
      }

      // 失敗した場合は直接DB登録にフォールバック
      Logger.log('Webhook失敗。直接DB登録を試みます...');
    } catch (error) {
      Logger.log('Webhook送信エラー: ' + error.message);
      Logger.log('直接DB登録を試みます...');
    }
  }

  // 直接Supabaseに登録
  insertCustomerDirectly(payload);
}

/**
 * Supabaseに直接顧客を登録
 */
function insertCustomerDirectly(customerData) {
  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  const DEFAULT_USER_ID = PropertiesService.getScriptProperties().getProperty('DEFAULT_USER_ID');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    return false;
  }

  if (!DEFAULT_USER_ID) {
    Logger.log('エラー: DEFAULT_USER_ID が設定されていません');
    Logger.log('スクリプトプロパティに DEFAULT_USER_ID を追加してください');
    return false;
  }

  // メールアドレスで重複チェック
  if (customerData.email) {
    try {
      const checkResp = UrlFetchApp.fetch(
        SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerData.email) + '&select=id',
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
          },
          muteHttpExceptions: true
        }
      );

      const existing = JSON.parse(checkResp.getContentText());
      if (existing && existing.length > 0) {
        Logger.log('既存顧客のため更新: ' + customerData.email);

        // 既存顧客を更新
        const updateResp = UrlFetchApp.fetch(
          SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerData.email),
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            payload: JSON.stringify({
              inflow_date: customerData.inflow_date,
              media: customerData.media
            }),
            muteHttpExceptions: true
          }
        );

        Logger.log('更新結果: ' + updateResp.getContentText());
        return true;
      }
    } catch (error) {
      Logger.log('重複チェックエラー: ' + error.message);
    }
  }

  // 新規顧客を登録（全フィールド対応）
  const insertData = {
    user_id: DEFAULT_USER_ID,
    name: customerData.name,
    email: customerData.email || null,
    furigana: customerData.furigana || null,
    gender: customerData.gender || null,
    phone_number: customerData.phone_number || null,
    age: customerData.age || null,
    address: customerData.address || null,
    desired_work_location: customerData.desired_work_location || null,
    desired_job_type: customerData.desired_job_type || null,
    desired_salary: customerData.desired_salary || null,
    final_education: customerData.final_education || null,
    employment_start_period: customerData.employment_start_period || null,
    current_job_type: customerData.current_job_type || null,
    current_company: customerData.current_company || null,
    drivers_license: customerData.drivers_license !== undefined ? customerData.drivers_license : null,
    available_time: customerData.available_time || null,
    inflow_date: customerData.inflow_date || new Date().toISOString(),
    media: customerData.media || 'Gmail'
  };

  try {
    // upsertを使用（重複時は更新、新規時は挿入）
    const insertResp = UrlFetchApp.fetch(
      SUPABASE_URL + '/rest/v1/customers?on_conflict=email',
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation,resolution=merge-duplicates'
        },
        payload: JSON.stringify(insertData),
        muteHttpExceptions: true
      }
    );

    const statusCode = insertResp.getResponseCode();
    const responseText = insertResp.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      Logger.log('直接DB登録成功: ' + responseText);

      // 登録した顧客のIDを取得してステータスレコードを作成（存在しない場合のみ）
      const insertedCustomer = JSON.parse(responseText);
      if (insertedCustomer && insertedCustomer.length > 0) {
        const customerId = insertedCustomer[0].id;
        // ステータスが既にあるかチェック
        const statusCheckResp = UrlFetchApp.fetch(
          SUPABASE_URL + '/rest/v1/statuses?customer_id=eq.' + customerId + '&select=id',
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
            },
            muteHttpExceptions: true
          }
        );
        const existingStatus = JSON.parse(statusCheckResp.getContentText());
        if (!existingStatus || existingStatus.length === 0) {
          createDefaultStatus(customerId, SUPABASE_URL, SUPABASE_SERVICE_KEY);
        }
      }

      return true;
    } else {
      Logger.log('直接DB登録失敗: ' + responseText);
      return false;
    }
  } catch (error) {
    Logger.log('直接DB登録エラー: ' + error.message);
    return false;
  }
}

/**
 * 新規顧客に「未接触」ステータスを作成
 */
function createDefaultStatus(customerId, supabaseUrl, serviceKey) {
  try {
    const statusData = {
      customer_id: customerId,
      current_status: '未接触',
      priority: '中',
      status_updated_date: new Date().toISOString()
    };

    const response = UrlFetchApp.fetch(
      supabaseUrl + '/rest/v1/statuses',
      {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': 'Bearer ' + serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        payload: JSON.stringify(statusData),
        muteHttpExceptions: true
      }
    );

    const statusCode = response.getResponseCode();
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log('ステータス「未接触」を作成: customer_id=' + customerId);
    } else {
      Logger.log('ステータス作成失敗: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('ステータス作成エラー: ' + error.message);
  }
}

/**
 * ステータスがない既存顧客に「未接触」ステータスを一括作成
 * 1回実行してください
 */
function fixMissingStatuses() {
  Logger.log('=== ステータスなし顧客の修正開始 ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    return;
  }

  // 全顧客を取得
  const customersResp = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/customers?select=id',
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    }
  );

  const customers = JSON.parse(customersResp.getContentText());
  Logger.log('顧客数: ' + customers.length);

  // 既存ステータスを取得
  const statusesResp = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/statuses?select=customer_id',
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    }
  );

  const statuses = JSON.parse(statusesResp.getContentText());
  const customerIdsWithStatus = new Set(statuses.map(s => s.customer_id));
  Logger.log('ステータスあり顧客数: ' + customerIdsWithStatus.size);

  // ステータスなし顧客を特定
  const customersWithoutStatus = customers.filter(c => !customerIdsWithStatus.has(c.id));
  Logger.log('ステータスなし顧客数: ' + customersWithoutStatus.length);

  // 各顧客にステータスを作成
  let createdCount = 0;
  for (const customer of customersWithoutStatus) {
    createDefaultStatus(customer.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    createdCount++;
    Utilities.sleep(100); // レート制限対策
  }

  Logger.log('=== 完了: ' + createdCount + '件のステータスを作成 ===');
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
      const from = message.getFrom();

      Logger.log('処理中: ' + subject);

      // 候補者メールかどうか判定
      if (isCandidateEmail(subject, body, from)) {
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
 * 簡単なバージョン確認テスト
 * このログが出れば最新コードが反映されている
 */
function testCodeVersion() {
  Logger.log('=== コードバージョン確認 ===');
  Logger.log('最終更新: 2025-12-03 v3');
  Logger.log('extractCustomerData関数は以下を抽出します:');
  Logger.log('  - 基本情報: 氏名, ふりがな, 性別, 年齢, メール, 電話番号');
  Logger.log('  - 希望条件: 希望勤務地, 希望職種, 希望年収');
  Logger.log('  - その他: 最終学歴, 就業開始までの期間, 現在の就業形態, 自動車免許');
  Logger.log('isCandidateEmail関数は以下をチェックします:');
  Logger.log('  - 件名キーワード: 送客NEXT, Zキャリア, 送客ナビ, 求職者応募通知');
  Logger.log('  - 送信元: snapjob_ad@roxx.co.jp, roxx.co.jp など');

  // 直接キーワードテスト
  const testSubject = '【Zキャリア プラットフォーム_送客NEXT】求職者応募通知情報';
  Logger.log('');
  Logger.log('テスト件名: ' + testSubject);
  Logger.log('Zキャリア を含む: ' + testSubject.includes('Zキャリア'));
  Logger.log('送客NEXT を含む: ' + testSubject.includes('送客NEXT'));

  const testFrom = 'snapjob_ad@roxx.co.jp';
  Logger.log('テスト送信者: ' + testFrom);
  Logger.log('snapjob_ad@roxx.co.jp を含む: ' + testFrom.includes('snapjob_ad@roxx.co.jp'));
  Logger.log('roxx.co.jp を含む: ' + testFrom.includes('roxx.co.jp'));

  // 実際の判定
  Logger.log('');
  Logger.log('=== isCandidateEmail 判定実行 ===');
  const result = isCandidateEmail(testSubject, '', testFrom);
  Logger.log('最終判定結果: ' + (result ? '✓ 候補者メール' : '✗ 対象外'));
}

/**
 * デバッグ: 特定の件名のメールをテスト
 * 「Zキャリア」を含むメールを検索して判定ロジックをテスト
 */
function debugTestZCareerEmail() {
  Logger.log('=== Zキャリア メールテスト ===');

  // Zキャリアを含むメールを検索
  const threads = GmailApp.search('subject:Zキャリア', 0, 5);
  Logger.log('検索結果: ' + threads.length + '件');

  if (threads.length === 0) {
    Logger.log('「Zキャリア」を含むメールが見つかりません');
    return;
  }

  for (const thread of threads) {
    const message = thread.getMessages()[0];
    const subject = message.getSubject();
    const from = message.getFrom();
    const body = message.getPlainBody();

    Logger.log('');
    Logger.log('=== メール情報 ===');
    Logger.log('件名: ' + subject);
    Logger.log('件名の長さ: ' + subject.length);
    Logger.log('件名のバイト列: ' + subject.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
    Logger.log('送信者: ' + from);
    Logger.log('日時: ' + message.getDate());

    // キーワードテスト
    Logger.log('');
    Logger.log('--- キーワードチェック ---');
    const keywords = ['送客NEXT', 'Zキャリア', '求職者応募通知'];
    for (const kw of keywords) {
      const found = subject.includes(kw);
      Logger.log(kw + ': ' + (found ? '✓ 発見' : '✗ なし'));
      if (!found) {
        Logger.log('  キーワードバイト: ' + kw.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
      }
    }

    // 実際の判定を実行
    Logger.log('');
    Logger.log('--- isCandidateEmail 判定 ---');
    const result = isCandidateEmail(subject, body, from);
    Logger.log('判定結果: ' + (result ? '✓ 候補者メール' : '✗ 対象外'));

    // 本文の最初の部分を表示
    Logger.log('');
    Logger.log('--- 本文（最初の300文字）---');
    Logger.log(body.substring(0, 300));
  }
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
 * snapjob_ad@roxx.co.jp, snapjob@roxx.co.jp → 送客NEXT
 * contact@jobseeker-navi.com → 送客ナビ
 * 転送メール（career@itadaki-career.com経由）にも対応
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
    { email: 'snapjob@roxx.co.jp', media: '送客NEXT', domain: 'roxx.co.jp' },
    { email: 'contact@jobseeker-navi.com', media: '送客ナビ', domain: 'jobseeker-navi.com' },
    { email: 'career@itadaki-career.com', media: '送客NEXT', domain: 'itadaki-career.com', isForwarder: true }  // 転送元（デフォルト: 送客NEXT）
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

        // 転送メールの場合、本文から実際の送信元を判定してmediaを決定
        let actualMedia = config.media;
        if (config.isForwarder) {
          // 送客ナビの場合のみ上書き（デフォルトは送客NEXT）
          if (body.includes('jobseeker-navi.com')) {
            actualMedia = '送客ナビ';
            Logger.log('転送メール: 送客ナビ を検出');
          } else {
            Logger.log('転送メール: 送客NEXT として処理');
          }
        }

        // メール本文から顧客のメールアドレスを抽出（送信元・転送元ドメイン除外）
        const allEmails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const customerEmails = allEmails.filter(email =>
          !email.includes('roxx.co.jp') &&
          !email.includes('jobseeker-navi.com') &&
          !email.includes('itadaki-career.com')
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
                media: actualMedia
              }),
              muteHttpExceptions: true
            }
          );

          const statusCode = updateResponse.getResponseCode();
          if (statusCode >= 200 && statusCode < 300) {
            const result = JSON.parse(updateResponse.getContentText());
            if (result && result.length > 0) {
              Logger.log('更新: ' + customerEmail + ' -> ' + inflowDate + ' / ' + actualMedia);
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
 * 特定のメールを強制的に処理（ラベル無視）
 * Zキャリア/送客NEXT のメールを探して処理
 */
function forceProcessZCareerEmails() {
  Logger.log('=== Zキャリアメール強制処理 ===');

  // Zキャリアまたは送客NEXTを含むメールを検索
  const threads = GmailApp.search('subject:(Zキャリア OR 送客NEXT)', 0, 10);
  Logger.log('検索結果: ' + threads.length + '件');

  let processedCount = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const subject = message.getSubject();
      const from = message.getFrom();
      const body = message.getPlainBody();

      Logger.log('');
      Logger.log('--- メール処理 ---');
      Logger.log('件名: ' + subject);
      Logger.log('送信者: ' + from);
      Logger.log('日時: ' + message.getDate());

      // ラベルを確認（情報としてログ）
      const labels = thread.getLabels();
      const labelNames = labels.map(l => l.getName());
      Logger.log('ラベル: ' + JSON.stringify(labelNames));

      // 強制的に処理
      processGmailMessage(message);
      processedCount++;
    }
  }

  Logger.log('');
  Logger.log('=== 処理完了: ' + processedCount + '件 ===');
}

/**
 * 「CRM処理済み」ラベルを特定メールから削除
 * Zキャリア/送客NEXTメールの処理済みラベルを外す
 */
function removeProcessedLabelFromZCareer() {
  Logger.log('=== CRM処理済みラベル削除 ===');

  const label = GmailApp.getUserLabelByName('CRM処理済み');
  if (!label) {
    Logger.log('「CRM処理済み」ラベルが存在しません');
    return;
  }

  const threads = GmailApp.search('subject:(Zキャリア OR 送客NEXT) label:CRM処理済み', 0, 20);
  Logger.log('対象スレッド数: ' + threads.length);

  for (const thread of threads) {
    const subject = thread.getFirstMessageSubject();
    thread.removeLabel(label);
    Logger.log('ラベル削除: ' + subject);
  }

  Logger.log('=== 削除完了 ===');
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

/**
 * パース機能のテスト
 * 実際のroxxメールフォーマットでextractCustomerDataが正しく動作するか検証
 */
function testExtractCustomerData() {
  Logger.log('=== extractCustomerData テスト ===');

  // roxxメールの実際のフォーマットに基づくテストデータ
  const testEmailBody = `株式会社頂
小宮山様

お世話になります。送客NEXT運営事務局です。
送客NEXT経由でのご応募がございましたので、
下記通り通知させていただきます。

▼登録情報
応募日時：2025年12月03日 00時57分
氏名：廣中 璃音
ふりがな：ひろなか りおん
性別：女性
年齢：18歳
メールアドレス：rion12242006@icloud.com
電話番号：09044165166
希望勤務地：千葉
希望職種：接客・サービス業
最終学歴：高校卒業
就業開始までの期間：できるだけ早く
現在の就業形態：パート・アルバイト
自動車免許の有無：いいえ

どうぞ宜しくお願い致します。`;

  const result = extractCustomerData(testEmailBody);

  Logger.log('抽出結果:');
  Logger.log('  name: ' + result.name);
  Logger.log('  furigana: ' + result.furigana);
  Logger.log('  gender: ' + result.gender);
  Logger.log('  age: ' + result.age);
  Logger.log('  email: ' + result.email);
  Logger.log('  phone_number: ' + result.phone_number);
  Logger.log('  desired_work_location: ' + result.desired_work_location);
  Logger.log('  desired_job_type: ' + result.desired_job_type);
  Logger.log('  final_education: ' + result.final_education);
  Logger.log('  employment_start_period: ' + result.employment_start_period);
  Logger.log('  current_job_type: ' + result.current_job_type);
  Logger.log('  drivers_license: ' + result.drivers_license);

  // 検証
  const expectedValues = {
    name: '廣中 璃音',
    furigana: 'ひろなか りおん',
    gender: '女性',
    age: 18,
    email: 'rion12242006@icloud.com',
    phone_number: '09044165166',
    desired_work_location: '千葉',
    desired_job_type: '接客・サービス業',
    final_education: '高校卒業',
    employment_start_period: 'できるだけ早く',
    current_job_type: 'パート・アルバイト',
    drivers_license: false
  };

  Logger.log('');
  Logger.log('=== 検証結果 ===');
  let allPassed = true;
  for (const [key, expected] of Object.entries(expectedValues)) {
    const actual = result[key];
    const passed = actual === expected;
    if (!passed) allPassed = false;
    Logger.log(key + ': ' + (passed ? '✓' : '✗ 期待値=' + expected + ', 実際=' + actual));
  }

  Logger.log('');
  Logger.log(allPassed ? '=== 全テスト成功 ===' : '=== テスト失敗あり ===');
  return allPassed;
}

/**
 * 既存顧客データを全フィールド更新
 * メールアドレスで顧客を特定し、抽出した全フィールドで更新
 */
function updateCustomerAllFields(customerData, supabaseUrl, serviceKey) {
  if (!customerData.email) {
    Logger.log('エラー: メールアドレスがありません');
    return { success: false, reason: 'no_email' };
  }

  // 更新データを構築（nullでないフィールドのみ）
  const updateData = {};

  if (customerData.name) updateData.name = customerData.name;
  if (customerData.furigana) updateData.furigana = customerData.furigana;
  if (customerData.gender) updateData.gender = customerData.gender;
  if (customerData.age) updateData.age = customerData.age;
  if (customerData.phone_number) updateData.phone_number = customerData.phone_number;
  if (customerData.address) updateData.address = customerData.address;
  if (customerData.desired_work_location) updateData.desired_work_location = customerData.desired_work_location;
  if (customerData.desired_job_type) updateData.desired_job_type = customerData.desired_job_type;
  if (customerData.desired_salary) updateData.desired_salary = customerData.desired_salary;
  if (customerData.final_education) updateData.final_education = customerData.final_education;
  if (customerData.employment_start_period) updateData.employment_start_period = customerData.employment_start_period;
  if (customerData.current_job_type) updateData.current_job_type = customerData.current_job_type;
  if (customerData.current_company) updateData.current_company = customerData.current_company;
  if (customerData.drivers_license !== undefined) updateData.drivers_license = customerData.drivers_license;
  if (customerData.available_time) updateData.available_time = customerData.available_time;
  if (customerData.inflow_date) updateData.inflow_date = customerData.inflow_date;
  if (customerData.media) updateData.media = customerData.media;

  try {
    const response = UrlFetchApp.fetch(
      supabaseUrl + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerData.email),
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': 'Bearer ' + serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true
      }
    );

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      const result = JSON.parse(responseText);
      if (result && result.length > 0) {
        return { success: true, customer: result[0] };
      } else {
        return { success: false, reason: 'not_found' };
      }
    } else {
      Logger.log('更新エラー: ' + responseText);
      return { success: false, reason: 'api_error', error: responseText };
    }
  } catch (error) {
    Logger.log('更新例外: ' + error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * 1件のroxxメールを再処理してDBを更新（テスト用）
 * 最新のroxxメールを1件取得して、全フィールドを再抽出・更新
 */
function reprocessSingleRoxxEmail() {
  Logger.log('=== 1件再処理テスト ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    return;
  }

  // roxxからの最新メールを1件取得
  const threads = GmailApp.search('from:snapjob_ad@roxx.co.jp OR from:snapjob@roxx.co.jp', 0, 1);

  if (threads.length === 0) {
    Logger.log('roxxからのメールが見つかりません');
    return;
  }

  const message = threads[0].getMessages()[0];
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const emailDate = message.getDate();

  Logger.log('件名: ' + subject);
  Logger.log('日時: ' + emailDate);

  // 全フィールドを抽出
  const customerData = extractCustomerData(body);
  customerData.inflow_date = emailDate.toISOString();
  customerData.media = '送客NEXT';

  Logger.log('');
  Logger.log('=== 抽出データ ===');
  for (const [key, value] of Object.entries(customerData)) {
    Logger.log('  ' + key + ': ' + value);
  }

  if (!customerData.email) {
    Logger.log('エラー: メールアドレスを抽出できませんでした');
    return;
  }

  // 更新前のデータを取得
  Logger.log('');
  Logger.log('=== 更新前のDBデータ ===');
  const beforeResp = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerData.email) + '&select=*',
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    }
  );
  const beforeData = JSON.parse(beforeResp.getContentText());
  if (beforeData && beforeData.length > 0) {
    Logger.log('  furigana: ' + beforeData[0].furigana);
    Logger.log('  gender: ' + beforeData[0].gender);
    Logger.log('  desired_work_location: ' + beforeData[0].desired_work_location);
    Logger.log('  desired_job_type: ' + beforeData[0].desired_job_type);
    Logger.log('  final_education: ' + beforeData[0].final_education);
    Logger.log('  employment_start_period: ' + beforeData[0].employment_start_period);
    Logger.log('  current_job_type: ' + beforeData[0].current_job_type);
    Logger.log('  drivers_license: ' + beforeData[0].drivers_license);
  } else {
    Logger.log('顧客がDBに存在しません: ' + customerData.email);
    return;
  }

  // 更新実行
  Logger.log('');
  Logger.log('=== 更新実行 ===');
  const result = updateCustomerAllFields(customerData, SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (result.success) {
    Logger.log('✓ 更新成功');
    Logger.log('');
    Logger.log('=== 更新後のDBデータ ===');
    Logger.log('  furigana: ' + result.customer.furigana);
    Logger.log('  gender: ' + result.customer.gender);
    Logger.log('  desired_work_location: ' + result.customer.desired_work_location);
    Logger.log('  desired_job_type: ' + result.customer.desired_job_type);
    Logger.log('  final_education: ' + result.customer.final_education);
    Logger.log('  employment_start_period: ' + result.customer.employment_start_period);
    Logger.log('  current_job_type: ' + result.customer.current_job_type);
    Logger.log('  drivers_license: ' + result.customer.drivers_license);
  } else {
    Logger.log('✗ 更新失敗: ' + result.reason);
  }

  return result;
}

/**
 * 過去のroxxメールを全件再処理（タイムアウト対応・再開可能版）
 * 6分制限とレート制限に対応
 * 完了するまで繰り返し実行してください
 */
function reprocessAllRoxxEmails() {
  const START_TIME = new Date().getTime();
  const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5分（6分制限より1分余裕）
  const RATE_LIMIT_DELAY_MS = 300; // 300msの待機（レート制限対策）

  Logger.log('=== roxxメール全件再処理開始 ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    return;
  }

  // 進捗を読み込み
  const props = PropertiesService.getScriptProperties();
  let progress = props.getProperty('reprocessRoxxProgress');
  progress = progress ? JSON.parse(progress) : {
    threadIndex: 0,
    messageIndex: 0,
    processedEmails: [],
    stats: { updated: 0, notFound: 0, noEmail: 0, errors: 0 }
  };

  Logger.log('再開位置: thread=' + progress.threadIndex + ', message=' + progress.messageIndex);
  Logger.log('処理済みメール数: ' + progress.processedEmails.length);

  // 全送客メールを検索（roxx直接、転送メール、送客ナビ）
  const searchQuery = 'from:snapjob_ad@roxx.co.jp OR from:snapjob@roxx.co.jp OR from:career@itadaki-career.com OR from:contact@jobseeker-navi.com';
  const threads = GmailApp.search(searchQuery, 0, 500);
  Logger.log('総スレッド数: ' + threads.length);
  Logger.log('検索クエリ: ' + searchQuery);

  let processedThisRun = 0;
  let shouldStop = false;

  for (let ti = progress.threadIndex; ti < threads.length && !shouldStop; ti++) {
    const thread = threads[ti];
    const messages = thread.getMessages();
    const startMessage = (ti === progress.threadIndex) ? progress.messageIndex : 0;

    for (let mi = startMessage; mi < messages.length && !shouldStop; mi++) {
      // タイムアウトチェック
      const elapsed = new Date().getTime() - START_TIME;
      if (elapsed > MAX_RUNTIME_MS) {
        Logger.log('⏰ タイムアウト間近。進捗を保存して停止します。');
        progress.threadIndex = ti;
        progress.messageIndex = mi;
        props.setProperty('reprocessRoxxProgress', JSON.stringify(progress));
        shouldStop = true;
        break;
      }

      const message = messages[mi];
      const body = message.getPlainBody();
      const emailDate = message.getDate();
      const subject = message.getSubject();

      // 全フィールドを抽出
      const customerData = extractCustomerData(body);

      if (!customerData.email) {
        Logger.log('スキップ（メールなし）: ' + subject.substring(0, 30));
        progress.stats.noEmail++;
        continue;
      }

      // 既に処理済みならスキップ
      if (progress.processedEmails.includes(customerData.email)) {
        continue;
      }

      // メタデータを追加
      customerData.inflow_date = emailDate.toISOString();
      customerData.media = '送客NEXT';

      // 更新実行
      const result = updateCustomerAllFields(customerData, SUPABASE_URL, SUPABASE_SERVICE_KEY);

      if (result.success) {
        Logger.log('✓ 更新: ' + customerData.name + ' (' + customerData.email + ')');
        progress.stats.updated++;
      } else if (result.reason === 'not_found') {
        Logger.log('- 未登録: ' + customerData.email);
        progress.stats.notFound++;
      } else {
        Logger.log('✗ エラー: ' + customerData.email + ' - ' + result.reason);
        progress.stats.errors++;
      }

      // 処理済みとして記録
      progress.processedEmails.push(customerData.email);
      processedThisRun++;

      // レート制限対策
      Utilities.sleep(RATE_LIMIT_DELAY_MS);
    }

    // 次のスレッドに移動する際にmessageIndexをリセット
    if (!shouldStop) {
      progress.messageIndex = 0;
    }
  }

  // 完了またはタイムアウト
  if (shouldStop) {
    Logger.log('');
    Logger.log('=== 一時停止 ===');
    Logger.log('今回の処理: ' + processedThisRun + '件');
    Logger.log('累計処理済み: ' + progress.processedEmails.length + '件');
    Logger.log('統計: 更新=' + progress.stats.updated + ', 未登録=' + progress.stats.notFound +
               ', メールなし=' + progress.stats.noEmail + ', エラー=' + progress.stats.errors);
    Logger.log('');
    Logger.log('⚠️ 処理が完了していません。再度実行してください。');
  } else {
    // 完了 - 進捗をクリア
    props.deleteProperty('reprocessRoxxProgress');
    Logger.log('');
    Logger.log('=== 全件処理完了 ===');
    Logger.log('総処理メール数: ' + progress.processedEmails.length + '件');
    Logger.log('統計:');
    Logger.log('  - 更新成功: ' + progress.stats.updated + '件');
    Logger.log('  - 未登録（新規）: ' + progress.stats.notFound + '件');
    Logger.log('  - メールなし: ' + progress.stats.noEmail + '件');
    Logger.log('  - エラー: ' + progress.stats.errors + '件');
  }

  return {
    completed: !shouldStop,
    processedThisRun: processedThisRun,
    totalProcessed: progress.processedEmails.length,
    stats: progress.stats
  };
}

/**
 * roxx再処理の進捗をリセット（最初からやり直したい場合）
 */
function resetReprocessRoxxProgress() {
  PropertiesService.getScriptProperties().deleteProperty('reprocessRoxxProgress');
  Logger.log('進捗をリセットしました。reprocessAllRoxxEmails() を実行すると最初から処理します。');
}

/**
 * roxx再処理の進捗を確認
 */
function checkReprocessRoxxProgress() {
  const progress = PropertiesService.getScriptProperties().getProperty('reprocessRoxxProgress');
  if (progress) {
    const p = JSON.parse(progress);
    Logger.log('=== 再処理進捗 ===');
    Logger.log('処理済みメール数: ' + p.processedEmails.length);
    Logger.log('現在位置: thread=' + p.threadIndex + ', message=' + p.messageIndex);
    Logger.log('統計: 更新=' + p.stats.updated + ', 未登録=' + p.stats.notFound +
               ', メールなし=' + p.stats.noEmail + ', エラー=' + p.stats.errors);
  } else {
    Logger.log('進捗データなし（未開始または完了済み）');
  }
}

/**
 * 未登録顧客を新規作成（タイムアウト対応・再開可能版）
 * reprocessAllRoxxEmailsで「未登録」となった顧客をDBに新規登録
 * 完了するまで繰り返し実行してください
 */
function createUnregisteredCustomers() {
  const START_TIME = new Date().getTime();
  const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5分（6分制限より1分余裕）
  const RATE_LIMIT_DELAY_MS = 500; // 500msの待機（レート制限対策）

  Logger.log('=== 未登録顧客の新規作成開始 ===');

  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  const DEFAULT_USER_ID = PropertiesService.getScriptProperties().getProperty('DEFAULT_USER_ID');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DEFAULT_USER_ID) {
    Logger.log('エラー: SUPABASE_URL, SUPABASE_SERVICE_KEY, または DEFAULT_USER_ID が設定されていません');
    return;
  }

  // 進捗を読み込み
  const props = PropertiesService.getScriptProperties();
  let progress = props.getProperty('createUnregisteredProgress');
  progress = progress ? JSON.parse(progress) : {
    threadIndex: 0,
    messageIndex: 0,
    processedEmails: [],
    stats: { created: 0, alreadyExists: 0, noEmail: 0, errors: 0 }
  };

  Logger.log('再開位置: thread=' + progress.threadIndex + ', message=' + progress.messageIndex);
  Logger.log('処理済みメール数: ' + progress.processedEmails.length);

  // 全送客メールを検索
  const searchQuery = 'from:snapjob_ad@roxx.co.jp OR from:snapjob@roxx.co.jp OR from:career@itadaki-career.com OR from:contact@jobseeker-navi.com';
  const threads = GmailApp.search(searchQuery, 0, 500);
  Logger.log('総スレッド数: ' + threads.length);

  let processedThisRun = 0;
  let shouldStop = false;

  for (let ti = progress.threadIndex; ti < threads.length && !shouldStop; ti++) {
    const thread = threads[ti];
    const messages = thread.getMessages();
    const startMessage = (ti === progress.threadIndex) ? progress.messageIndex : 0;

    for (let mi = startMessage; mi < messages.length && !shouldStop; mi++) {
      // タイムアウトチェック
      const elapsed = new Date().getTime() - START_TIME;
      if (elapsed > MAX_RUNTIME_MS) {
        Logger.log('⏰ タイムアウト間近。進捗を保存して停止します。');
        progress.threadIndex = ti;
        progress.messageIndex = mi;
        props.setProperty('createUnregisteredProgress', JSON.stringify(progress));
        shouldStop = true;
        break;
      }

      const message = messages[mi];
      const body = message.getPlainBody();
      const emailDate = message.getDate();
      const from = message.getFrom();

      // 全フィールドを抽出
      const customerData = extractCustomerData(body);

      if (!customerData.email) {
        progress.stats.noEmail++;
        continue;
      }

      // 既に処理済みならスキップ
      if (progress.processedEmails.includes(customerData.email)) {
        continue;
      }

      // DBに既に存在するかチェック
      try {
        const checkResp = UrlFetchApp.fetch(
          SUPABASE_URL + '/rest/v1/customers?email=eq.' + encodeURIComponent(customerData.email) + '&select=id',
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
            },
            muteHttpExceptions: true
          }
        );

        const existing = JSON.parse(checkResp.getContentText());
        if (existing && existing.length > 0) {
          // 既に存在する場合はスキップ
          progress.processedEmails.push(customerData.email);
          progress.stats.alreadyExists++;
          continue;
        }

        // 新規作成
        // メタデータを追加
        customerData.inflow_date = emailDate.toISOString();
        customerData.media = getMediaFromSender(from, body);

        const insertData = {
          user_id: DEFAULT_USER_ID,
          name: customerData.name,
          email: customerData.email || null,
          furigana: customerData.furigana || null,
          gender: customerData.gender || null,
          phone_number: customerData.phone_number || null,
          age: customerData.age || null,
          address: customerData.address || null,
          desired_work_location: customerData.desired_work_location || null,
          desired_job_type: customerData.desired_job_type || null,
          desired_salary: customerData.desired_salary || null,
          final_education: customerData.final_education || null,
          employment_start_period: customerData.employment_start_period || null,
          current_job_type: customerData.current_job_type || null,
          current_company: customerData.current_company || null,
          drivers_license: customerData.drivers_license !== undefined ? customerData.drivers_license : null,
          available_time: customerData.available_time || null,
          inflow_date: customerData.inflow_date,
          media: customerData.media
        };

        // upsertを使用（重複時は更新、新規時は挿入）
        // on_conflict=email で重複時の動作を制御
        const insertResp = UrlFetchApp.fetch(
          SUPABASE_URL + '/rest/v1/customers?on_conflict=email',
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            payload: JSON.stringify(insertData),
            muteHttpExceptions: true
          }
        );

        const statusCode = insertResp.getResponseCode();
        if (statusCode >= 200 && statusCode < 300) {
          const insertedCustomer = JSON.parse(insertResp.getContentText());
          if (insertedCustomer && insertedCustomer.length > 0) {
            // 新規作成の場合のみステータスレコードを作成（idが新しいかどうかで判定は難しいので、
            // ステータスが既にあるかをチェック）
            const customerId = insertedCustomer[0].id;
            const statusCheckResp = UrlFetchApp.fetch(
              SUPABASE_URL + '/rest/v1/statuses?customer_id=eq.' + customerId + '&select=id',
              {
                method: 'GET',
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
                },
                muteHttpExceptions: true
              }
            );
            const existingStatus = JSON.parse(statusCheckResp.getContentText());
            if (!existingStatus || existingStatus.length === 0) {
              createDefaultStatus(customerId, SUPABASE_URL, SUPABASE_SERVICE_KEY);
              Logger.log('✓ 新規作成: ' + customerData.name + ' (' + customerData.email + ')');
              progress.stats.created++;
            } else {
              Logger.log('✓ 更新（upsert）: ' + customerData.name + ' (' + customerData.email + ')');
              progress.stats.alreadyExists++;
            }
          }
        } else {
          Logger.log('✗ 作成エラー: ' + customerData.email + ' - ' + insertResp.getContentText());
          progress.stats.errors++;
        }

      } catch (error) {
        Logger.log('✗ 例外: ' + customerData.email + ' - ' + error.message);
        progress.stats.errors++;
      }

      // 処理済みとして記録
      progress.processedEmails.push(customerData.email);
      processedThisRun++;

      // レート制限対策
      Utilities.sleep(RATE_LIMIT_DELAY_MS);
    }

    // 次のスレッドに移動する際にmessageIndexをリセット
    if (!shouldStop) {
      progress.messageIndex = 0;
    }
  }

  // 完了またはタイムアウト
  if (shouldStop) {
    Logger.log('');
    Logger.log('=== 一時停止 ===');
    Logger.log('今回の処理: ' + processedThisRun + '件');
    Logger.log('累計処理済み: ' + progress.processedEmails.length + '件');
    Logger.log('統計: 新規作成=' + progress.stats.created + ', 既存=' + progress.stats.alreadyExists +
               ', メールなし=' + progress.stats.noEmail + ', エラー=' + progress.stats.errors);
    Logger.log('');
    Logger.log('⚠️ 処理が完了していません。再度実行してください。');
  } else {
    // 完了 - 進捗をクリア
    props.deleteProperty('createUnregisteredProgress');
    Logger.log('');
    Logger.log('=== 全件処理完了 ===');
    Logger.log('総処理メール数: ' + progress.processedEmails.length + '件');
    Logger.log('統計:');
    Logger.log('  - 新規作成: ' + progress.stats.created + '件');
    Logger.log('  - 既存（スキップ）: ' + progress.stats.alreadyExists + '件');
    Logger.log('  - メールなし: ' + progress.stats.noEmail + '件');
    Logger.log('  - エラー: ' + progress.stats.errors + '件');
  }

  return {
    completed: !shouldStop,
    processedThisRun: processedThisRun,
    totalProcessed: progress.processedEmails.length,
    stats: progress.stats
  };
}

/**
 * 未登録顧客作成の進捗をリセット
 */
function resetCreateUnregisteredProgress() {
  PropertiesService.getScriptProperties().deleteProperty('createUnregisteredProgress');
  Logger.log('進捗をリセットしました。createUnregisteredCustomers() を実行すると最初から処理します。');
}

/**
 * 未登録顧客作成の進捗を確認
 */
function checkCreateUnregisteredProgress() {
  const progress = PropertiesService.getScriptProperties().getProperty('createUnregisteredProgress');
  if (progress) {
    const p = JSON.parse(progress);
    Logger.log('=== 未登録顧客作成進捗 ===');
    Logger.log('処理済みメール数: ' + p.processedEmails.length);
    Logger.log('現在位置: thread=' + p.threadIndex + ', message=' + p.messageIndex);
    Logger.log('統計: 新規作成=' + p.stats.created + ', 既存=' + p.stats.alreadyExists +
               ', メールなし=' + p.stats.noEmail + ', エラー=' + p.stats.errors);
  } else {
    Logger.log('進捗データなし（未開始または完了済み）');
  }
}
