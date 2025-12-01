import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Gmail Pub/Sub Push Notification Handler
 *
 * このEdge FunctionはGoogle Cloud Pub/SubからのPush通知を受信します。
 * Gmail Push Notificationsの仕組み:
 * 1. Gmailが新しいメールを受信
 * 2. Gmail APIがPub/Subトピックに通知を送信
 * 3. Pub/SubがこのEdge FunctionにPushする
 * 4. このFunctionがGASのWeb Appを呼び出してメール処理をトリガー
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Gmail Pub/Sub Handler Start ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))

    // Pub/Sub Pushメッセージを取得
    const payload = await req.json()
    console.log('Received Pub/Sub payload:', JSON.stringify(payload, null, 2))

    // Pub/Sub Pushメッセージの形式:
    // {
    //   "message": {
    //     "data": "base64encoded...",  // {"emailAddress": "xxx", "historyId": "xxx"}
    //     "messageId": "xxx",
    //     "publishTime": "xxx"
    //   },
    //   "subscription": "projects/xxx/subscriptions/xxx"
    // }

    const message = payload.message
    if (!message) {
      console.log('No message in payload - might be a test request')
      return new Response(
        JSON.stringify({ success: true, message: 'No Pub/Sub message found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Base64デコードしてメッセージデータを取得
    let messageData: any = {}
    if (message.data) {
      try {
        const decodedData = atob(message.data)
        messageData = JSON.parse(decodedData)
        console.log('Decoded message data:', JSON.stringify(messageData, null, 2))
      } catch (decodeError) {
        console.error('Failed to decode message data:', decodeError)
      }
    }

    // メッセージ情報をログ
    console.log('Message ID:', message.messageId)
    console.log('Publish Time:', message.publishTime)
    console.log('Email Address:', messageData.emailAddress)
    console.log('History ID:', messageData.historyId)

    // GAS Web App URLを取得して呼び出し
    const gasWebAppUrl = Deno.env.get('GAS_WEBAPP_URL')

    if (gasWebAppUrl) {
      console.log('Triggering GAS Web App...')
      try {
        const gasResponse = await fetch(gasWebAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trigger: 'pubsub',
            emailAddress: messageData.emailAddress,
            historyId: messageData.historyId,
            messageId: message.messageId,
            timestamp: new Date().toISOString(),
          }),
        })

        const gasResult = await gasResponse.text()
        console.log('GAS response status:', gasResponse.status)
        console.log('GAS response:', gasResult)
      } catch (gasError) {
        console.error('Failed to trigger GAS:', gasError)
        // GAS呼び出しが失敗してもPub/Subにはsuccessを返す
        // （失敗するとPub/Subがリトライを繰り返す）
      }
    } else {
      console.log('GAS_WEBAPP_URL not configured - skipping GAS trigger')
    }

    // Pub/Subに200を返す（これがないとリトライされる）
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Gmail notification processed',
        data: {
          messageId: message.messageId,
          emailAddress: messageData.emailAddress,
          historyId: messageData.historyId,
          processedAt: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error processing Pub/Sub message:', error)

    // エラーでも200を返す（Pub/Subの無限リトライを防ぐ）
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error occurred but returning 200 to prevent retry loop'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
