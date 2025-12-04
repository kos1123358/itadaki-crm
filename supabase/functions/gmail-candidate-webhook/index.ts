import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// メール本文から顧客情報を抽出する関数
function parseEmailContent(emailBody: string): any {
  const customerData: any = {}

  // HTMLタグを削除してプレーンテキストに変換
  const plainText = emailBody.replace(/<[^>]*>/g, '\n')

  // 名前の抽出（複数パターン対応）
  // パターン1: 名前：姓　名［ふりがな］（括弧付きパターンを優先）
  let nameMatch = plainText.match(/(?:氏名|名前)[：:\s]*([^［\n]+)［([^］]+)］/i)
  if (nameMatch) {
    customerData.name = nameMatch[1].trim().replace(/\s+/g, ' ')
    customerData.furigana = nameMatch[2].trim()
  } else {
    // パターン2: 氏名：姓 名（括弧なし）
    nameMatch = plainText.match(/(?:氏名|名前)[：:\s]*([^\n]+)/i)
    if (nameMatch) {
      customerData.name = nameMatch[1].trim().replace(/\s+/g, ' ')
    }
  }

  // ふりがなの抽出
  if (!customerData.furigana) {
    const furiganaMatch = plainText.match(/(?:ふりがな|フリガナ)[：:\s]*([^\n]+)/i)
    if (furiganaMatch) {
      customerData.furigana = furiganaMatch[1].trim()
    }
  }

  // メールアドレスの抽出
  const emailMatch = plainText.match(/(?:メールアドレス|メール|Email|E-mail)[：:\s]*([^\s\n]+@[^\s\n]+)/i)
  if (emailMatch) {
    customerData.email = emailMatch[1].trim().toLowerCase()
  }

  // 電話番号の抽出（複数パターン）
  const phoneMatch = plainText.match(/(?:電話番号|★電話番号|TEL)[：:\s]*([0-9\-]{10,13})/i)
  if (phoneMatch) {
    customerData.phone_number = phoneMatch[1].trim()
  }

  // 年齢の抽出（「19歳」「25」などの形式）
  const ageMatch = plainText.match(/(?:年齢|Age)[：:\s]*(\d+)(?:歳)?/i)
  if (ageMatch) {
    customerData.age = parseInt(ageMatch[1])
  }

  // 性別の抽出
  const genderMatch = plainText.match(/(?:性別|Gender)[：:\s]*(男性|女性|男|女)/i)
  if (genderMatch) {
    const gender = genderMatch[1]
    customerData.gender = gender === '男' ? '男性' : gender === '女' ? '女性' : gender
  }

  // 住所の抽出
  const addressMatch = plainText.match(/(?:★住所|住所|Address)[：:\s]*([^\n]+)/i)
  if (addressMatch) {
    customerData.address = addressMatch[1].trim()
  }

  // 希望勤務地の抽出
  const locationMatch = plainText.match(/(?:希望勤務地|勤務地)[：:\s]*([^\n]+)/i)
  if (locationMatch) {
    customerData.desired_work_location = locationMatch[1].trim()
  }

  // 希望職種の抽出
  const jobTypeMatch = plainText.match(/(?:希望職種)[：:\s]*([^\n]+)/i)
  if (jobTypeMatch) {
    customerData.desired_job_type = jobTypeMatch[1].trim()
  }

  // 希望年収の抽出（「400〜500万円」などの形式）
  const salaryMatch = plainText.match(/(?:希望年収)[：:\s]*(\d+)(?:〜|～)?(\d+)?(?:万円)?/i)
  if (salaryMatch) {
    // 範囲の場合は平均値を取る
    if (salaryMatch[2]) {
      const min = parseInt(salaryMatch[1])
      const max = parseInt(salaryMatch[2])
      customerData.desired_salary = Math.round((min + max) / 2)
    } else {
      customerData.desired_salary = parseInt(salaryMatch[1])
    }
  }

  // 最終学歴の抽出
  const educationMatch = plainText.match(/(?:最終学歴)[：:\s]*([^\n]+)/i)
  if (educationMatch) {
    customerData.education = educationMatch[1].trim()
  }

  // 現在の就業形態の抽出
  const employmentMatch = plainText.match(/(?:現在の就業形態)[：:\s]*([^\n]+)/i)
  if (employmentMatch) {
    customerData.current_employment_type = employmentMatch[1].trim()
  }

  // 転職希望時期の抽出
  const timingMatch = plainText.match(/(?:転職希望時期|就業開始までの期間)[：:\s]*([^\n]+)/i)
  if (timingMatch) {
    customerData.desired_timing = timingMatch[1].trim()
  }

  // 面談可能時間の抽出
  const availableMatch = plainText.match(/(?:繋がり易い時間帯|面談可能時間)[：:\s]*([^\n]+)/i)
  if (availableMatch) {
    customerData.available_time = availableMatch[1].trim()
  }

  // 自己PRの抽出（複数行対応）
  const prMatch = plainText.match(/(?:自己PR)[：:\s]*([^\n]+(?:\n(?!［)[^\n]+)*)/i)
  if (prMatch) {
    customerData.self_pr = prMatch[1].trim().replace(/\n/g, ' ')
  }

  // 応募日時の抽出
  const applyDateMatch = plainText.match(/(?:応募日時)[：:\s]*([^\n]+)/i)
  if (applyDateMatch) {
    customerData.apply_date = applyDateMatch[1].trim()
  }

  return customerData
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // API Key認証チェック（Google Apps Scriptから送信される）
    const apiKey = req.headers.get('x-api-key')
    const validApiKey = Deno.env.get('GMAIL_WEBHOOK_API_KEY')

    if (!apiKey || apiKey !== validApiKey) {
      console.error('Invalid API Key')
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
    const payload = await req.json()
    console.log('Received payload:', JSON.stringify(payload, null, 2))

    // メール本文を取得
    const emailBody = payload.emailBody || payload.body || ''
    const emailSubject = payload.subject || ''
    const emailFrom = payload.from || ''

    if (!emailBody) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request: emailBody is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // メール本文から顧客情報を抽出
    const customerData = parseEmailContent(emailBody)
    console.log('Parsed customer data:', JSON.stringify(customerData, null, 2))

    // 必須フィールドのチェック
    const { name, email } = customerData
    if (!name || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request: Could not extract required fields (name and email) from email body',
          parsedData: customerData
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
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle()

    if (existingCustomer) {
      console.log('Customer already exists:', existingCustomer.id)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Conflict: Customer with this email already exists',
          customer_id: existingCustomer.id,
          customer: existingCustomer
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Gmail経由のユーザーにはデフォルトのuser_idを設定
    const defaultUserId = Deno.env.get('WEBHOOK_DEFAULT_USER_ID')
    if (!defaultUserId) {
      console.error('WEBHOOK_DEFAULT_USER_ID not configured')
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
      name: customerData.name,
      email: customerData.email,
      furigana: customerData.furigana || null,
      phone_number: customerData.phone_number || null,
      age: customerData.age || null,
      gender: customerData.gender || null,
      address: customerData.address || null,
      media: 'Gmail自動登録',
      route: 'Gmail経由',
      inflow_date: payload.inflow_date || payload.emailDate || new Date().toISOString().split('T')[0],
      current_company: customerData.current_company || null,
      current_job_type: customerData.current_job_type || null,
      current_salary: customerData.current_salary || null,
      desired_job_type: customerData.desired_job_type || null,
      desired_industry: customerData.desired_industry || null,
      desired_salary: customerData.desired_salary || null,
      desired_work_location: customerData.desired_work_location || null,
      available_time: customerData.available_time || null,
    }

    console.log('Creating customer:', JSON.stringify(newCustomer, null, 2))

    // 顧客を登録
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .insert([newCustomer])
      .select()
      .single()

    if (customerError) {
      console.error('Customer creation error:', customerError)
      throw customerError
    }

    console.log('Customer created:', customer.id)

    // ステータスデータを準備
    const statusData = {
      customer_id: customer.id,
      current_status: '未接触',
      priority: '中',
      status_updated_date: new Date().toISOString(),
    }

    // ステータスを作成
    const { error: statusError } = await supabaseClient
      .from('statuses')
      .insert([statusData])

    if (statusError) {
      console.error('Status creation error:', statusError)
      throw statusError
    }

    console.log('Status created for customer:', customer.id)

    // 成功レスポンス
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Customer created successfully from Gmail',
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
    console.error('Error:', error)
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
