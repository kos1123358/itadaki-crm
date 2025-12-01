import { supabase } from './supabase';

// 顧客API
export const customerAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // JOINで一括取得（N+1問題を解消）
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        statusInfo:statuses(*),
        callHistories:call_histories(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // callHistoriesを日付降順でソート
    const customersWithSortedHistories = customers.map(customer => ({
      ...customer,
      callHistories: (customer.callHistories || []).sort(
        (a, b) => new Date(b.call_date) - new Date(a.call_date)
      )
    }));

    return { data: customersWithSortedHistories };
  },

  getById: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // JOINで一括取得
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        statusInfo:statuses(*),
        callHistories:call_histories(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // callHistoriesを日付降順でソート
    return {
      data: {
        ...customer,
        callHistories: (customer.callHistories || []).sort(
          (a, b) => new Date(b.call_date) - new Date(a.call_date)
        )
      }
    };
  },

  create: async (customerData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customerData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    // 自動的に「未接触」ステータスを作成
    await supabase
      .from('statuses')
      .insert([{
        customer_id: data.id,
        current_status: '未接触',
        priority: '中',
        status_updated_date: new Date().toISOString()
      }]);

    return { data };
  },

  update: async (id, customerData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true } };
  },

  search: async (params) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('customers')
      .select('*');

    if (params.name) {
      query = query.ilike('name', `%${params.name}%`);
    }
    if (params.email) {
      query = query.ilike('email', `%${params.email}%`);
    }
    if (params.phone_number) {
      query = query.ilike('phone_number', `%${params.phone_number}%`);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  },
};

// 架電履歴API
export const callHistoryAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('call_histories')
      .select(`
        *,
        customers!inner (
          id,
          name,
          user_id
        )
      `)
      .order('call_date', { ascending: false });

    if (error) throw error;

    // customersをcustomerに変換（単数形で返す）
    const dataWithCustomer = data.map(item => ({
      ...item,
      customer: item.customers,
    }));

    return { data: dataWithCustomer };
  },

  getByCustomer: async (customerId) => {
    const { data, error } = await supabase
      .from('call_histories')
      .select('*')
      .eq('customer_id', customerId)
      .order('call_date', { ascending: false });

    if (error) throw error;
    return { data };
  },

  create: async (callHistoryData) => {
    const { data, error } = await supabase
      .from('call_histories')
      .insert([callHistoryData])
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  update: async (id, callHistoryData) => {
    const { data, error } = await supabase
      .from('call_histories')
      .update(callHistoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('call_histories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true } };
  },
};

// ステータスAPI
export const statusAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('statuses')
      .select(`
        *,
        customers!inner (
          id,
          name,
          user_id
        )
      `)
      .order('status_updated_date', { ascending: false });

    if (error) throw error;
    return { data };
  },

  getSummary: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('statuses')
      .select(`
        current_status,
        customers!inner (
          user_id
        )
      `);

    if (error) throw error;

    // Group by status and count
    const summary = data.reduce((acc, item) => {
      const status = item.current_status;
      if (!acc[status]) {
        acc[status] = { status, count: 0 };
      }
      acc[status].count += 1;
      return acc;
    }, {});

    return { data: Object.values(summary) };
  },

  getByCustomer: async (customerId) => {
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (error) throw error;
    return { data };
  },

  update: async (customerId, statusData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First check if status exists (use maybeSingle to avoid error when not found)
    const { data: existing, error: checkError } = await supabase
      .from('statuses')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    // Ignore "not found" errors, throw others
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Add status_updated_date to the update
    const dataWithDate = {
      ...statusData,
      status_updated_date: new Date().toISOString()
    };

    let updatedStatus;

    if (existing) {
      // Update existing status
      const { data, error } = await supabase
        .from('statuses')
        .update(dataWithDate)
        .eq('customer_id', customerId)
        .select()
        .single();

      if (error) throw error;
      updatedStatus = data;

      // Save history if status actually changed
      if (existing.current_status !== statusData.current_status ||
          existing.priority !== statusData.priority ||
          existing.assigned_staff !== statusData.assigned_staff) {

        await supabase.from('status_histories').insert([{
          customer_id: customerId,
          previous_status: existing.current_status,
          new_status: statusData.current_status,
          previous_priority: existing.priority,
          new_priority: statusData.priority,
          previous_assigned_staff: existing.assigned_staff,
          new_assigned_staff: statusData.assigned_staff,
          changed_by: user.id,
          notes: statusData.notes
        }]);
      }
    } else {
      // Create new status
      const { data, error } = await supabase
        .from('statuses')
        .insert([{ ...dataWithDate, customer_id: customerId }])
        .select()
        .single();

      if (error) throw error;
      updatedStatus = data;

      // Save initial status as history
      await supabase.from('status_histories').insert([{
        customer_id: customerId,
        previous_status: null,
        new_status: statusData.current_status,
        previous_priority: null,
        new_priority: statusData.priority,
        previous_assigned_staff: null,
        new_assigned_staff: statusData.assigned_staff,
        changed_by: user.id,
        notes: statusData.notes
      }]);
    }

    return { data: updatedStatus };
  },
};

// ステータス履歴API
export const statusHistoryAPI = {
  getByCustomer: async (customerId) => {
    const { data, error } = await supabase
      .from('status_histories')
      .select('*')
      .eq('customer_id', customerId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return { data };
  },

  create: async (historyData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('status_histories')
      .insert([{ ...historyData, changed_by: user.id }])
      .select()
      .single();

    if (error) throw error;
    return { data };
  },
};

// 求人API
export const jobAPI = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  },

  getMatching: async (customerId) => {
    // 顧客情報を取得
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 全ての求人を取得（後でマッチングスコアを計算）
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    // マッチングスコアを計算
    const jobsWithScore = jobs.map(job => {
      let score = 0;
      let maxScore = 0;

      // 職種マッチング（最重要）
      maxScore += 40;
      if (customer.desired_job_type && job.job_type) {
        const desiredTypes = Array.isArray(customer.desired_job_type)
          ? customer.desired_job_type
          : [customer.desired_job_type];
        if (desiredTypes.includes(job.job_type)) {
          score += 40;
        }
      }

      // 業種マッチング
      maxScore += 30;
      if (customer.desired_industry && job.industry) {
        const desiredIndustries = Array.isArray(customer.desired_industry)
          ? customer.desired_industry
          : [customer.desired_industry];
        if (desiredIndustries.includes(job.industry)) {
          score += 30;
        }
      }

      // 年収マッチング
      maxScore += 20;
      if (customer.desired_salary && job.salary_min && job.salary_max) {
        if (customer.desired_salary >= job.salary_min && customer.desired_salary <= job.salary_max) {
          score += 20;
        } else if (Math.abs(customer.desired_salary - job.salary_min) <= 100) {
          score += 10;
        }
      }

      // 勤務地マッチング
      maxScore += 10;
      if (customer.desired_work_location && job.location) {
        if (job.location.includes(customer.desired_work_location) ||
            customer.desired_work_location.includes(job.location.split('都')[0] + '都') ||
            customer.desired_work_location.includes(job.location.split('府')[0] + '府') ||
            customer.desired_work_location.includes(job.location.split('県')[0] + '県')) {
          score += 10;
        }
      }

      const matchScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      return {
        ...job,
        matchScore,
        salary: job.salary_min && job.salary_max
          ? `${job.salary_min}-${job.salary_max}万円`
          : `${job.salary_min || job.salary_max}万円～`
      };
    });

    // スコアの高い順にソート
    jobsWithScore.sort((a, b) => b.matchScore - a.matchScore);

    return { data: jobsWithScore };
  },

  create: async (jobData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...jobData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  update: async (id, jobData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('jobs')
      .update(jobData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { data: { success: true } };
  },
};

// ユーザー・プロフィールAPI
export const userAPI = {
  // 全ユーザーとプロフィールを取得（ドロップダウン用）
  getAllWithProfiles: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // profilesテーブルからユーザー情報を取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) throw profilesError;

    // auth.usersからメールアドレスを取得するためにuser-management APIを使用
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-management?action=list`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }

    const authData = await response.json();
    const authUsers = authData.users || [];

    // profilesとauth.usersを結合
    const usersWithProfiles = authUsers.map(authUser => {
      const profile = profiles.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        username: profile?.username || null,
        displayName: profile?.username || authUser.email,
      };
    });

    return { data: usersWithProfiles, currentUserId: user.id };
  },

  // 現在のユーザー情報を取得
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    return {
      data: {
        id: user.id,
        email: user.email,
        username: profile?.username || null,
        displayName: profile?.username || user.email,
      }
    };
  },

  // プロフィール更新
  updateProfile: async (username) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username })
      .select()
      .single();

    if (error) throw error;
    return { data };
  },
};
