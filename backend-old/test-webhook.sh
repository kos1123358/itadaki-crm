#!/bin/bash

# Webhook APIテストスクリプト

API_URL="http://localhost:5001/api/webhook/customer"
API_KEY="404636423355846ca9ff79b290f0d091e621b85bf49836d2810ab712e8d18f6d"

echo "===== Webhook API テスト ====="
echo ""

# テスト1: API Key なし（401エラーを期待）
echo "1. API Key なしでテスト（401エラーを期待）"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"name":"テストユーザー","email":"test@example.com"}' \
  -w "\nステータスコード: %{http_code}\n\n"

# テスト2: 必須フィールド不足（400エラーを期待）
echo "2. 必須フィールド不足でテスト（400エラーを期待）"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"name":"テストユーザー"}' \
  -w "\nステータスコード: %{http_code}\n\n"

# テスト3: 正常登録
echo "3. 正常な顧客登録"
RANDOM_EMAIL="test_$(date +%s)@example.com"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"name\": \"テストユーザー\",
    \"furigana\": \"てすとゆーざー\",
    \"email\": \"$RANDOM_EMAIL\",
    \"phone_number\": \"090-1234-5678\",
    \"age\": 25,
    \"media\": \"Web広告\",
    \"route\": \"Webhook経由\",
    \"priority\": \"高\"
  }" \
  -w "\nステータスコード: %{http_code}\n\n"

# テスト4: メールアドレス重複（409エラーを期待）
echo "4. メールアドレス重複でテスト（409エラーを期待）"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"name\": \"重複ユーザー\",
    \"email\": \"$RANDOM_EMAIL\"
  }" \
  -w "\nステータスコード: %{http_code}\n\n"

echo "===== テスト完了 ====="
