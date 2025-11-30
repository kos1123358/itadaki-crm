import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // API Key認証チェック
    const apiKey = req.headers.get('x-api-key')
    const validApiKey = Deno.env.get('WEBHOOK_API_KEY')

    if (!apiKey || apiKey !== validApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid API Key'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // リクエストボディを取得
    const customerData = await req.json()

    // 必須フィールドのチェック
    const { name, email } = customerData
    if (!name || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request: name and email are required fields'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabaseクライアントを作成（サービスロールキーを使用）
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // メールアドレスの重複チェック
    const { data: existingCustomer } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('email', email)
      .single()

    if (existingCustomer) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Conflict: Customer with this email already exists',
          customer_id: existingCustomer.id
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Webhook経由のユーザーにはデフォルトのuser_idを設定（環境変数から取得）
    const defaultUserId = Deno.env.get('WEBHOOK_DEFAULT_USER_ID')
    if (!defaultUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error: WEBHOOK_DEFAULT_USER_ID not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 顧客データを準備
    const newCustomer = {
      user_id: defaultUserId,
      name,
      email,
      furigana: customerData.furigana || null,
      phone_number: customerData.phone_number || null,
      age: customerData.age || null,
      gender: customerData.gender || null,
      address: customerData.address || null,
      media: customerData.media || null,
      route: customerData.route || 'Webhook経由',
      current_company: customerData.current_company || null,
      current_job_type: customerData.current_job_type || null,
      current_salary: customerData.current_salary || null,
      desired_job_type: customerData.desired_job_type || null,
      desired_salary: customerData.desired_salary || null,
      desired_work_location: customerData.desired_work_location || null,
    }

    // 顧客を登録
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .insert([newCustomer])
      .select()
      .single()

    if (customerError) {
      throw customerError
    }

    // ステータスデータを準備
    const statusData = {
      customer_id: customer.id,
      current_status: '新規登録',
      priority: customerData.priority || '中',
      status_updated_date: new Date().toISOString(),
    }

    // ステータスを作成
    const { error: statusError } = await supabaseClient
      .from('statuses')
      .insert([statusData])

    if (statusError) {
      throw statusError
    }

    // 成功レスポンス
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Customer created successfully via webhook',
        data: {
          customer_id: customer.id,
          name: customer.name,
          email: customer.email,
          status: '新規登録',
          created_at: customer.created_at
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
