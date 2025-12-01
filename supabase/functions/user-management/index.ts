import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
serve(async (req)=>{
  // CORS preflight対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Supabase管理者クライアントを作成
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // リクエストから認証トークンを取得
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('認証トークンがありません');
    }
    // ユーザー認証を確認
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('認証に失敗しました');
    }
    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    // ユーザー一覧取得（プロフィール情報含む）
    if (method === 'GET' && action === 'list') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      // プロフィール情報も取得
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, username');
      // ユーザー情報とプロフィールを結合
      const usersWithProfiles = data.users.map((user)=>{
        const profile = profiles?.find((p)=>p.id === user.id);
        return {
          ...user,
          username: profile?.username || null
        };
      });
      return new Response(JSON.stringify({
        users: usersWithProfiles
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // ユーザー名更新
    if (method === 'PUT' && action === 'update-profile') {
      const { userId, username } = await req.json();
      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }
      // プロフィールを更新（なければ作成）
      const { data, error } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        username: username || null
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({
        success: true,
        profile: data
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // ユーザー招待
    if (method === 'POST' && action === 'invite') {
      const { email } = await req.json();
      if (!email) {
        throw new Error('メールアドレスが必要です');
      }
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (error) throw error;
      return new Response(JSON.stringify({
        success: true,
        user: data.user
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // ユーザー削除
    if (method === 'DELETE' && action === 'delete') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    throw new Error('無効なリクエストです');
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
