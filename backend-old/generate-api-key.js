#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 安全なランダムAPI Keyを生成するツール
 */

// API Keyの長さ（デフォルト: 32文字）
const API_KEY_LENGTH = process.argv[2] || 32;

// ランダムなAPI Keyを生成
function generateApiKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// .envファイルのパス
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// API Keyを生成
const apiKey = generateApiKey(API_KEY_LENGTH);

console.log('========================================');
console.log('Webhook API Key 生成ツール');
console.log('========================================\n');

console.log(`生成されたAPI Key:\n${apiKey}\n`);
console.log('このAPI Keyは安全な場所に保管してください。\n');

// .envファイルが存在するかチェック
if (!fs.existsSync(envPath)) {
  console.log('.envファイルが存在しません。');

  // .env.exampleが存在するかチェック
  if (fs.existsSync(envExamplePath)) {
    console.log('.env.exampleから.envファイルを作成しています...\n');

    // .env.exampleを読み込み
    let envContent = fs.readFileSync(envExamplePath, 'utf8');

    // WEBHOOK_API_KEYを実際のキーに置き換え
    envContent = envContent.replace(
      'WEBHOOK_API_KEY=your-secret-api-key-here',
      `WEBHOOK_API_KEY=${apiKey}`
    );

    // .envファイルに書き込み
    fs.writeFileSync(envPath, envContent);

    console.log('✅ .envファイルを作成し、API Keyを設定しました。');
    console.log(`📁 ファイル: ${envPath}\n`);
  } else {
    console.log('⚠️  .env.exampleファイルが見つかりません。');
    console.log('手動で.envファイルを作成し、以下の行を追加してください:\n');
    console.log(`WEBHOOK_API_KEY=${apiKey}\n`);
  }
} else {
  console.log('.envファイルが既に存在します。');

  // .envファイルの内容を読み込み
  let envContent = fs.readFileSync(envPath, 'utf8');

  // WEBHOOK_API_KEYが既に設定されているかチェック
  if (envContent.includes('WEBHOOK_API_KEY=')) {
    console.log('既にWEBHOOK_API_KEYが設定されています。\n');
    console.log('オプション:');
    console.log('1. 既存のAPI Keyを使用する');
    console.log('2. 手動で.envファイルを編集して新しいAPI Keyに置き換える');
    console.log(`   WEBHOOK_API_KEY=${apiKey}\n`);

    // 現在のAPI Keyを表示（セキュリティ上マスキング）
    const currentKeyMatch = envContent.match(/WEBHOOK_API_KEY=(.+)/);
    if (currentKeyMatch && currentKeyMatch[1]) {
      const currentKey = currentKeyMatch[1].trim();
      const maskedKey = currentKey.substring(0, 8) + '...' + currentKey.substring(currentKey.length - 4);
      console.log(`現在のAPI Key: ${maskedKey}`);
    }
  } else {
    // WEBHOOK_API_KEYが設定されていない場合は追加
    console.log('WEBHOOK_API_KEYを.envファイルに追加しています...\n');

    // 末尾に改行がない場合は追加
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }

    // API Keyを追加
    envContent += `\n# Webhook API Key（自動生成）\nWEBHOOK_API_KEY=${apiKey}\n`;

    // ファイルに書き込み
    fs.writeFileSync(envPath, envContent);

    console.log('✅ .envファイルにAPI Keyを追加しました。');
    console.log(`📁 ファイル: ${envPath}\n`);
  }
}

console.log('========================================');
console.log('次のステップ:');
console.log('========================================');
console.log('1. サーバーを再起動してください:');
console.log('   npm run dev\n');
console.log('2. Webhook APIをテストしてください:');
console.log('   ./test-webhook.sh\n');
console.log('または手動でcURLコマンドを実行:');
console.log(`   curl -X POST http://localhost:5001/api/webhook/customer \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -H "x-api-key: ${apiKey}" \\`);
console.log(`     -d '{"name":"テストユーザー","email":"test@example.com"}'\n`);
console.log('========================================\n');
