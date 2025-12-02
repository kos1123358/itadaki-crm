'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Descriptions, Button, Form, Select, Input, DatePicker, Space, Tag, Divider, Statistic, Row, Col, message, Badge, Typography, Timeline, Collapse, List, Modal, notification } from 'antd';
import { PhoneOutlined, SaveOutlined, StepForwardOutlined, CopyOutlined, ClockCircleOutlined, UserOutlined, HistoryOutlined, EditOutlined, CheckOutlined, PhoneFilled, StopOutlined, TrophyOutlined, EnvironmentOutlined, DollarOutlined, BellOutlined } from '@ant-design/icons';
import { customerAPI, callHistoryAPI, statusAPI, jobAPI, userAPI } from '@/lib/api';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

// 希望職種の選択肢
const JOB_TYPE_OPTIONS = [
  '営業',
  'マーケティング',
  'エンジニア',
  'デザイナー',
  '企画',
  'コンサルタント',
  '人事',
  '経理・財務',
  '総務',
  'カスタマーサポート',
  'プロジェクトマネージャー',
  'データアナリスト',
];

// 希望業種の選択肢
const INDUSTRY_OPTIONS = [
  'IT・Web',
  '金融',
  '製造',
  '医療・ヘルスケア',
  '小売',
  '不動産',
  '建設',
  '教育',
  'メディア',
  'コンサルティング',
  '人材サービス',
  '物流',
];

// モック求人データ
const mockJobs = {
  1: [ // 佐藤花子に合致する求人
    {
      id: 1,
      title: 'マーケティングマネージャー',
      company: '株式会社テックマーケティング',
      salary: '500-700万円',
      location: '東京都渋谷区',
      jobType: 'マーケティング',
      industry: 'IT・Web',
      matchScore: 95,
      description: 'Webマーケティング戦略の立案・実行をお任せします',
    },
    {
      id: 2,
      title: 'デジタルマーケティング担当',
      company: '株式会社グロースパートナーズ',
      salary: '450-600万円',
      location: '東京都港区',
      jobType: 'マーケティング',
      industry: 'IT・Web',
      matchScore: 88,
      description: 'SNS・広告運用を中心としたデジタルマーケティング業務',
    },
    {
      id: 3,
      title: 'プロダクトマーケター',
      company: '株式会社イノベーションラボ',
      salary: '550-750万円',
      location: '東京都新宿区',
      jobType: 'マーケティング',
      industry: 'IT・Web',
      matchScore: 82,
      description: 'SaaSプロダクトのマーケティング戦略立案・実行',
    },
  ],
  2: [ // 鈴木一郎に合致する求人
    {
      id: 4,
      title: 'プロジェクトマネージャー',
      company: '株式会社システムソリューションズ',
      salary: '600-800万円',
      location: '大阪府大阪市',
      jobType: 'プロジェクトマネージャー',
      industry: 'IT・Web',
      matchScore: 92,
      description: '大規模システム開発プロジェクトのマネジメント',
    },
    {
      id: 5,
      title: 'ITコンサルタント',
      company: '株式会社ビジネスコンサルティング',
      salary: '650-900万円',
      location: '大阪府北区',
      jobType: 'コンサルタント',
      industry: 'コンサルティング',
      matchScore: 85,
      description: 'IT戦略立案からシステム導入支援まで幅広く対応',
    },
    {
      id: 6,
      title: 'テックリード',
      company: '株式会社デジタルイノベーション',
      salary: '700-1000万円',
      location: '大阪府中央区',
      jobType: 'エンジニア',
      industry: 'IT・Web',
      matchScore: 78,
      description: '開発チームのリーダーとして技術選定・設計を主導',
    },
  ],
};

// モックデータ
const mockCustomers = [
  {
    id: 1,
    name: '佐藤花子',
    furigana: 'さとうはなこ',
    email: 'sato.hanako@example.com',
    phone_number: '080-1111-2222',
    age: 32,
    gender: '女性',
    address: '東京都渋谷区渋谷1-1-1',
    current_company: '株式会社テスト商事',
    current_job_type: '営業',
    current_salary: 450,
    desired_job_type: ['マーケティング'],
    desired_industry: [],
    desired_salary: 550,
    desired_work_location: '東京都',
    transfer_reason: '',
    available_time: '平日19時以降、土日終日',
    inflow_date: '2025-11-20',
    media: 'リクナビ',
    route: 'Web応募',
    statusInfo: {
      current_status: '新規登録',
      priority: '中',
      assigned_staff: '山田太郎',
      last_contact_date: null,
      notes: '積極的に転職を検討中'
    },
    callHistories: []
  },
  {
    id: 2,
    name: '鈴木一郎',
    furigana: 'すずきいちろう',
    email: 'suzuki.ichiro@example.com',
    phone_number: '090-3333-4444',
    age: 28,
    gender: '男性',
    address: '大阪府大阪市北区梅田2-2-2',
    current_company: '株式会社サンプル',
    current_job_type: 'エンジニア',
    current_salary: 500,
    desired_job_type: ['プロジェクトマネージャー', 'エンジニア'],
    desired_industry: ['IT・Web', 'コンサルティング'],
    desired_salary: 650,
    desired_work_location: '大阪府',
    transfer_reason: 'キャリアアップ',
    available_time: '平日12-13時、18時以降',
    inflow_date: '2025-11-25',
    media: 'マイナビ転職',
    route: 'スカウト',
    statusInfo: {
      current_status: '初回コンタクト待ち',
      priority: '高',
      assigned_staff: '鈴木次郎',
      last_contact_date: '2025-11-28',
      notes: '緊急度高い、早めの連絡希望'
    },
    callHistories: [
      {
        id: 4,
        call_date: '2025-11-28T19:00:00',
        call_type: '発信',
        call_result: '接続成功',
        duration: 15,
        notes: '本人と接続成功。転職意向について簡単にヒアリング。次回面談日程を調整予定',
        staff_name: '鈴木次郎'
      },
      {
        id: 3,
        call_date: '2025-11-27T13:00:00',
        call_type: '発信',
        call_result: '不在',
        duration: null,
        notes: 'お昼休みの時間帯に架電。応答なし',
        staff_name: '鈴木次郎'
      },
      {
        id: 2,
        call_date: '2025-11-26T17:30:00',
        call_type: '発信',
        call_result: '留守電',
        duration: null,
        notes: '留守電にメッセージを残した。折り返しをお願いする旨伝達',
        staff_name: '鈴木次郎'
      },
      {
        id: 1,
        call_date: '2025-11-26T14:00:00',
        call_type: '発信',
        call_result: '不在',
        duration: null,
        notes: '呼び出し音のみ、応答なし',
        staff_name: '鈴木次郎'
      }
    ]
  }
];

export default function CallWork() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId');
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [callForm] = Form.useForm();
  const [hearingForm] = Form.useForm();
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [livePreviewData, setLivePreviewData] = useState(null);
  const [isJobModalVisible, setIsJobModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeCallRecord, setActiveCallRecord] = useState(['call-record']);
  const [activeHearing, setActiveHearing] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [todayStats, setTodayStats] = useState({
    total: 0,
    completed: 0,
    connected: 0,
    notConnected: 0
  });
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // JSON文字列または配列を配列に変換するヘルパー関数
  const parseArrayField = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // 顧客データ取得
  useEffect(() => {
    fetchCustomers();
  }, []);

  // リアルタイム購読: 新規顧客登録を検知
  const handleRealtimeInsert = useCallback((newCustomer) => {
    notification.info({
      message: '新規顧客登録',
      description: `${newCustomer.name || newCustomer.email} が登録されました`,
      icon: <BellOutlined style={{ color: '#52c41a' }} />,
      duration: 5,
    });
    // 新しい顧客をリストに追加
    setCustomers(prev => {
      if (prev.some(c => c.id === newCustomer.id)) return prev;
      return [{ ...newCustomer, statusInfo: null, callHistories: [] }, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((updatedCustomer) => {
    setCustomers(prev =>
      prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c)
    );
    // 現在表示中の顧客が更新された場合、表示も更新
    if (currentCustomer?.id === updatedCustomer.id) {
      setCurrentCustomer(prev => ({ ...prev, ...updatedCustomer }));
    }
  }, [currentCustomer?.id]);

  useRealtimeSubscription('customers', {
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
  });

  // 顧客が変わったら求人データを取得
  useEffect(() => {
    if (currentCustomer) {
      fetchJobs();
    }
  }, [currentCustomer]);

  // ユーザー一覧を取得
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, currentUserId: userId } = await userAPI.getAllWithProfiles();
      setUsers(data || []);
      setCurrentUserId(userId);
      // デフォルトで自分を選択
      if (userId) {
        callForm.setFieldsValue({ caller_id: userId });
      }
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getAll();
      const customerList = response.data || [];
      setCustomers(customerList);

      if (customerList.length > 0) {
        let startIndex = 0;
        let startCustomer = customerList[0];

        // URLパラメータで指定された顧客から開始
        if (initialCustomerId) {
          const targetIndex = customerList.findIndex(c => c.id === parseInt(initialCustomerId));
          if (targetIndex !== -1) {
            startIndex = targetIndex;
            startCustomer = customerList[targetIndex];
            message.success(`${startCustomer.name}さんから架電を開始します`);
          }
        }

        setCurrentIndex(startIndex);
        setCurrentCustomer(startCustomer);

        // ヒアリングフォームに初期値を設定
        if (startCustomer.desired_job_type) {
          setSelectedJobTypes(Array.isArray(startCustomer.desired_job_type) ? startCustomer.desired_job_type : []);
        }
        if (startCustomer.desired_industry) {
          setSelectedIndustries(Array.isArray(startCustomer.desired_industry) ? startCustomer.desired_industry : []);
        }
      }
    } catch (error) {
      console.error('顧客データ取得エラー:', error);
      message.error('顧客データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    if (!currentCustomer) return;

    try {
      setLoadingJobs(true);
      const response = await jobAPI.getMatching(currentCustomer.id);
      setJobs(response.data || []);
    } catch (error) {
      console.error('求人データ取得エラー:', error);
      // エラーメッセージは表示しない（求人データがない場合も正常）
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
    message.info('通話を開始しました');
  };

  const endCall = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsCallActive(false);
    message.info('通話を終了しました');
  };

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(currentCustomer.phone_number);
    message.success('電話番号をコピーしました');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreview = async () => {
    try {
      // ヒアリング内容を取得
      const hearingValues = hearingForm.getFieldsValue();

      // 架電記録のステータス変更を取得
      const callValues = callForm.getFieldsValue();

      // プレビューデータを作成
      const preview = {
        ...currentCustomer,
        ...hearingValues
      };

      // ステータス変更がある場合は反映
      if (callValues.new_status) {
        preview.statusInfo = {
          ...currentCustomer.statusInfo,
          current_status: callValues.new_status
        };
      }

      // 架電記録がある場合は履歴に追加
      if (callValues.call_type || callValues.call_result) {
        const newCallHistory = {
          id: Date.now(), // 仮のID
          call_date: new Date().toISOString(),
          call_type: callValues.call_type || '発信',
          call_result: callValues.call_result || '',
          duration: isCallActive ? callDuration : null,
          notes: callValues.notes || '',
          staff_name: '担当者', // TODO: ログインユーザー名
          next_action: callValues.next_action || '',
          next_contact_date: callValues.next_contact_date || null,
          isPreview: true // プレビュー用のフラグ
        };

        preview.callHistories = [newCallHistory, ...(currentCustomer.callHistories || [])];
      }

      setPreviewData(preview);
      setIsPreviewMode(true);
      message.success('変更内容をプレビュー表示しました');
    } catch (error) {
      console.error('プレビューエラー:', error);
      message.error('プレビューに失敗しました');
    }
  };

  const handleCancelPreview = () => {
    // プレビューモードを解除（フォームの値は保持される）
    setIsPreviewMode(false);
    setPreviewData(null);
    message.info('編集モードに戻りました');
  };

  const handleSaveAndNext = async () => {
    try {
      // ヒアリング内容を保存
      const hearingValues = hearingForm.getFieldsValue();

      // 配列フィールドを文字列に変換（DBの型に合わせる）
      const hearingData = {
        // 職務情報
        current_company: hearingValues.current_company || null,
        current_job_type: hearingValues.current_job_type || null,
        current_salary: hearingValues.current_salary ? parseInt(hearingValues.current_salary) : null,
        company_experience_count: hearingValues.company_experience_count ? parseInt(hearingValues.company_experience_count) : null,
        final_education: hearingValues.final_education || null,
        job_change_schedule: hearingValues.job_change_schedule || null,
        job_change_status: hearingValues.job_change_status || null,
        employment_start_period: hearingValues.employment_start_period || null,
        // 希望条件
        desired_job_type: hearingValues.desired_job_type || null,
        desired_industry: hearingValues.desired_industry || null,
        desired_salary: hearingValues.desired_salary ? parseInt(hearingValues.desired_salary) : null,
        desired_work_location: hearingValues.desired_work_location || null,
        transfer_reason: hearingValues.transfer_reason || null,
        // その他
        drivers_license: hearingValues.drivers_license,
        available_time: hearingValues.available_time || null,
      };

      console.log('保存するヒアリングデータ:', hearingData);

      try {
        await customerAPI.update(currentCustomer.id, hearingData);
        message.success('ヒアリング内容を保存しました');
      } catch (error) {
        console.error('ヒアリング保存エラー:', error);
        message.error('ヒアリング内容の保存に失敗しました: ' + error.message);
      }

      // 架電記録を保存
      const values = await callForm.validateFields();

      // 架電履歴を作成
      // 架電担当者の表示名を取得
      const caller = users.find(u => u.id === values.caller_id);
      const callerName = caller?.displayName || '';

      await callHistoryAPI.create({
        customer_id: currentCustomer.id,
        call_date: new Date().toISOString(),
        call_type: values.call_type || '発信',
        call_result: values.call_result,
        duration: isCallActive ? callDuration : null,
        notes: values.notes || '',
        staff_name: callerName,
        caller_id: values.caller_id || null,
        next_action: values.next_action || '',
        next_contact_date: values.next_contact_date ? values.next_contact_date.toISOString() : null,
      });

      // ステータス更新がある場合
      if (values.new_status) {
        await statusAPI.update(currentCustomer.id, {
          current_status: values.new_status,
          last_contact_date: new Date().toISOString(),
        });
      }

      message.success('架電記録を保存しました');

      // フォームをリセット
      callForm.resetFields();
      // 架電担当者をデフォルト（自分）に戻す
      if (currentUserId) {
        callForm.setFieldsValue({ caller_id: currentUserId });
      }
      hearingForm.resetFields();
      setSelectedResult(null);
      setSelectedStatus(null);
      setIsPreviewMode(false);
      setPreviewData(null);

      // 通話を停止
      if (isCallActive) {
        endCall();
      }

      // 顧客データを再取得
      await fetchCustomers();

      // 次の顧客に移動
      const nextIndex = (currentIndex + 1) % customers.length;
      setCurrentIndex(nextIndex);
      if (customers[nextIndex]) {
        setCurrentCustomer(customers[nextIndex]);
        // 次の顧客のヒアリング情報を設定
        if (customers[nextIndex].desired_job_type) {
          setSelectedJobTypes(Array.isArray(customers[nextIndex].desired_job_type) ? customers[nextIndex].desired_job_type : []);
        }
        if (customers[nextIndex].desired_industry) {
          setSelectedIndustries(Array.isArray(customers[nextIndex].desired_industry) ? customers[nextIndex].desired_industry : []);
        }
      }

      // 統計を更新
      setTodayStats(prev => ({
        ...prev,
        completed: prev.completed + 1,
        connected: values.call_result === '接続成功' ? prev.connected + 1 : prev.connected,
        notConnected: values.call_result !== '接続成功' ? prev.notConnected + 1 : prev.notConnected
      }));
    } catch (error) {
      message.error('架電記録の入力内容を確認してください');
    }
  };

  const handleSkip = () => {
    if (customers.length === 0) return;

    const nextIndex = (currentIndex + 1) % customers.length;
    setCurrentIndex(nextIndex);
    setCurrentCustomer(customers[nextIndex]);
    callForm.resetFields();
    // 架電担当者をデフォルト（自分）に戻す
    if (currentUserId) {
      callForm.setFieldsValue({ caller_id: currentUserId });
    }
    setSelectedResult(null);
    setSelectedStatus(null);
    setIsPreviewMode(false);
    setPreviewData(null);
    // 希望職種と希望業種も次の顧客のデータで初期化される（useEffectで自動的に処理）
    endCall();
    message.info('次の顧客にスキップしました');
  };

  const handleResultClick = (result) => {
    setSelectedResult(result);
    callForm.setFieldsValue({ call_result: result });
    // 接続成功の場合はヒアリング項目を開く
    if (result === '接続成功') {
      setActiveHearing(['hearing']);
    } else {
      // 接続成功以外の場合はステータスをクリア
      setSelectedStatus(null);
      callForm.setFieldsValue({ new_status: undefined });
    }
    updateLivePreview();
  };

  const handleStatusClick = (status) => {
    setSelectedStatus(status);
    callForm.setFieldsValue({ new_status: status });
    updateLivePreview();
  };

  const handleJobTypeToggle = (jobType) => {
    const newSelection = selectedJobTypes.includes(jobType)
      ? selectedJobTypes.filter(j => j !== jobType)
      : [...selectedJobTypes, jobType];
    setSelectedJobTypes(newSelection);
    hearingForm.setFieldsValue({ desired_job_type: newSelection });
    updateLivePreview();
  };

  const handleJobTypeSelectAll = () => {
    setSelectedJobTypes([...JOB_TYPE_OPTIONS]);
    hearingForm.setFieldsValue({ desired_job_type: [...JOB_TYPE_OPTIONS] });
    updateLivePreview();
  };

  const handleJobTypeClearAll = () => {
    setSelectedJobTypes([]);
    hearingForm.setFieldsValue({ desired_job_type: [] });
    updateLivePreview();
  };

  const handleIndustryToggle = (industry) => {
    const newSelection = selectedIndustries.includes(industry)
      ? selectedIndustries.filter(i => i !== industry)
      : [...selectedIndustries, industry];
    setSelectedIndustries(newSelection);
    hearingForm.setFieldsValue({ desired_industry: newSelection });
    updateLivePreview();
  };

  const handleIndustrySelectAll = () => {
    setSelectedIndustries([...INDUSTRY_OPTIONS]);
    hearingForm.setFieldsValue({ desired_industry: [...INDUSTRY_OPTIONS] });
    updateLivePreview();
  };

  const handleIndustryClearAll = () => {
    setSelectedIndustries([]);
    hearingForm.setFieldsValue({ desired_industry: [] });
    updateLivePreview();
  };

  // 求人詳細モーダルを開く
  const handleJobClick = (job) => {
    setSelectedJob(job);
    setIsJobModalVisible(true);
  };

  // 求人詳細モーダルを閉じる
  const handleJobModalClose = () => {
    setIsJobModalVisible(false);
    setSelectedJob(null);
  };

  // パネル開閉のハンドラー
  const handleCallRecordChange = (keys) => {
    setActiveCallRecord(keys);
  };

  const handleHearingChange = (keys) => {
    setActiveHearing(keys);
  };

  const handleJobsChange = (keys) => {
    setActiveJobs(keys);
    // マッチング求人を開いた場合、他のパネルを閉じる
    if (keys.includes('jobs')) {
      setActiveCallRecord([]);
      setActiveHearing([]);
    }
  };

  // リアルタイムプレビューを更新
  const updateLivePreview = () => {
    const hearingValues = hearingForm.getFieldsValue();
    const callValues = callForm.getFieldsValue();

    const preview = {
      ...currentCustomer,
      ...hearingValues
    };

    // ステータス変更がある場合は反映
    if (callValues.new_status) {
      preview.statusInfo = {
        ...currentCustomer.statusInfo,
        current_status: callValues.new_status
      };
    }

    // 架電記録がある場合は履歴に追加（リアルタイムプレビュー）
    if (callValues.call_type || callValues.call_result || callValues.notes) {
      const newCallHistory = {
        id: 'preview-' + Date.now(), // プレビュー用の仮ID
        call_date: new Date().toISOString(),
        call_type: callValues.call_type || '発信',
        call_result: callValues.call_result || '',
        duration: isCallActive ? callDuration : null,
        notes: callValues.notes || '',
        staff_name: '担当者', // TODO: ログインユーザー名
        next_action: callValues.next_action || '',
        next_contact_date: callValues.next_contact_date || null,
        isLivePreview: true // ライブプレビュー用のフラグ
      };

      preview.callHistories = [newCallHistory, ...(currentCustomer.callHistories || [])];
    }

    setLivePreviewData(preview);
  };

  // 顧客が変わったときにヒアリングフォームを初期化
  useEffect(() => {
    if (!currentCustomer) return;

    const jobTypes = parseArrayField(currentCustomer.desired_job_type);
    const industries = parseArrayField(currentCustomer.desired_industry);

    setSelectedJobTypes(jobTypes);
    setSelectedIndustries(industries);
    setLivePreviewData(null); // ライブプレビューをクリア

    hearingForm.setFieldsValue({
      // 職務情報
      current_company: currentCustomer.current_company || '',
      current_job_type: currentCustomer.current_job_type || '',
      current_salary: currentCustomer.current_salary || '',
      company_experience_count: currentCustomer.company_experience_count || '',
      final_education: currentCustomer.final_education || undefined,
      job_change_schedule: currentCustomer.job_change_schedule || undefined,
      job_change_status: currentCustomer.job_change_status || undefined,
      employment_start_period: currentCustomer.employment_start_period || undefined,
      // 希望条件
      desired_job_type: jobTypes,
      desired_industry: industries,
      desired_salary: currentCustomer.desired_salary || '',
      desired_work_location: currentCustomer.desired_work_location || '',
      transfer_reason: currentCustomer.transfer_reason || '',
      // その他
      drivers_license: currentCustomer.drivers_license,
      available_time: currentCustomer.available_time || '',
    });
  }, [currentCustomer, hearingForm]);

  // 表示用の顧客データ（プレビューモードならpreviewData、リアルタイムならlivePreviewData、通常モードならcurrentCustomer）
  const displayCustomer = isPreviewMode && previewData ? previewData : (livePreviewData || currentCustomer);

  // ローディング中の表示
  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  // 顧客データがない場合
  if (!currentCustomer || customers.length === 0) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <div>架電対象の顧客がありません</div>
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => window.location.href = '/customers'}>
            顧客を追加する
          </Button>
        </div>
      </div>
    );
  }

  // 変更があったかチェックするヘルパー関数
  const hasChanged = (field) => {
    // プレビューモードまたはライブプレビューがある場合
    const compareData = isPreviewMode ? previewData : livePreviewData;
    if (!compareData) return false;

    const oldValue = currentCustomer[field];
    const newValue = compareData[field];

    // null/undefined/空文字を正規化
    const normalizeValue = (val) => {
      if (val === null || val === undefined || val === '') return null;
      return val;
    };

    const normalizedOld = normalizeValue(oldValue);
    const normalizedNew = normalizeValue(newValue);

    // 配列の場合は深い比較
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      // 両方とも空配列の場合は変更なし
      if (oldValue.length === 0 && newValue.length === 0) return false;
      if (oldValue.length !== newValue.length) return true;
      return !oldValue.every((val, index) => val === newValue[index]);
    }

    // 片方だけが配列の場合
    if (Array.isArray(oldValue) || Array.isArray(newValue)) {
      // 空配列とnull/undefinedは同じとみなす
      const oldIsEmpty = Array.isArray(oldValue) && oldValue.length === 0;
      const newIsEmpty = Array.isArray(newValue) && newValue.length === 0;
      const oldIsNull = !Array.isArray(oldValue) && normalizedOld === null;
      const newIsNull = !Array.isArray(newValue) && normalizedNew === null;

      if ((oldIsEmpty || oldIsNull) && (newIsEmpty || newIsNull)) return false;
      return true;
    }

    return normalizedOld !== normalizedNew;
  };

  // 変更前と変更後のデータを両方取得するヘルパー関数
  const getChangePreview = (field) => {
    const compareData = isPreviewMode ? previewData : livePreviewData;
    if (!compareData || !hasChanged(field)) return null;

    const oldValue = currentCustomer[field];
    const newValue = compareData[field];

    return { oldValue, newValue };
  };

  return (
    <div style={{ padding: 16, backgroundColor: '#f0f2f5', paddingBottom: 80 }}>
      {/* ヘッダー統計 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="本日の架電予定"
              value={todayStats.total}
              prefix={<PhoneOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="完了"
              value={todayStats.completed}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="接続成功"
              value={todayStats.connected}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="不通"
              value={todayStats.notConnected}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* 左側：顧客情報とステータス */}
        <Col xs={24} lg={8}>
          {/* 顧客情報パネル */}
          <Card
            title={
              <Space>
                <UserOutlined />
                顧客情報
                <Badge count={`${currentIndex + 1} / ${customers.length}`} style={{ backgroundColor: '#52c41a' }} />
                {isPreviewMode && <Tag color="orange">変更プレビュー中</Tag>}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Space orientation="vertical" style={{ width: '100%' }} size="large">
              {/* 通話タイマー */}
              {isCallActive && (
                <Card size="small" style={{ backgroundColor: '#fff2e8', borderColor: '#ff7a45' }}>
                  <Space>
                    <ClockCircleOutlined style={{ fontSize: 24, color: '#ff7a45' }} />
                    <Text strong style={{ fontSize: 24 }}>
                      {formatDuration(callDuration)}
                    </Text>
                    <Text type="secondary">通話中...</Text>
                  </Space>
                </Card>
              )}

              {/* 基本情報 */}
              <div>
                <Title level={3} style={{ marginBottom: 8 }}>
                  {displayCustomer.name}
                  <Text type="secondary" style={{ fontSize: 16, marginLeft: 12 }}>
                    ({displayCustomer.furigana})
                  </Text>
                </Title>

                <Space size="large" wrap>
                  <Space>
                    <PhoneOutlined style={{ color: '#1890ff' }} />
                    <Text strong style={{ fontSize: 18 }}>
                      {displayCustomer.phone_number}
                    </Text>
                    <Button
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={copyPhoneNumber}
                      size="small"
                    >
                      コピー
                    </Button>
                  </Space>
                  <Tag color="blue">{displayCustomer.age}歳</Tag>
                  <Tag color="purple">{displayCustomer.gender}</Tag>
                </Space>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* 基本情報 */}
              <Text strong style={{ color: '#666', fontSize: 12 }}>基本情報</Text>
              <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                <Descriptions.Item label="メール">{displayCustomer.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="住所">{displayCustomer.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="媒体">{displayCustomer.media || '-'}</Descriptions.Item>
                <Descriptions.Item label="経路">{displayCustomer.route || '-'}</Descriptions.Item>
                <Descriptions.Item label="流入日">
                  {displayCustomer.inflow_date ? dayjs(displayCustomer.inflow_date).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="繋がりやすい時間帯">
                  <Text type="warning" strong>{displayCustomer.available_time || '-'}</Text>
                </Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '8px 0' }} />

              {/* 職務情報 */}
              <Text strong style={{ color: '#666', fontSize: 12 }}>職務情報</Text>
              <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                <Descriptions.Item label="現職">{displayCustomer.current_company || '-'}</Descriptions.Item>
                <Descriptions.Item label="現職種">
                  {getChangePreview('current_job_type') ? (
                    <div>
                      <Text delete type="secondary">{getChangePreview('current_job_type').oldValue}</Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {getChangePreview('current_job_type').newValue}
                      </Text>
                    </div>
                  ) : (
                    <span>{displayCustomer.current_job_type || '-'}</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="現年収">
                  {getChangePreview('current_salary') ? (
                    <div>
                      <Text delete type="secondary">{getChangePreview('current_salary').oldValue}万円</Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {getChangePreview('current_salary').newValue}万円
                      </Text>
                    </div>
                  ) : (
                    <span>{displayCustomer.current_salary ? `${displayCustomer.current_salary}万円` : '-'}</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="社数経験">
                  {displayCustomer.company_experience_count ? `${displayCustomer.company_experience_count}社` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="転職希望時期">{displayCustomer.job_change_schedule || '-'}</Descriptions.Item>
                <Descriptions.Item label="転職活動状況">{displayCustomer.job_change_status || '-'}</Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '8px 0' }} />

              {/* 希望条件 */}
              <Text strong style={{ color: '#666', fontSize: 12 }}>希望条件</Text>
              <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                <Descriptions.Item label="希望職種">
                  {getChangePreview('desired_job_type') ? (
                    <div>
                      <Text delete type="secondary">
                        {parseArrayField(getChangePreview('desired_job_type').oldValue).length > 0
                          ? parseArrayField(getChangePreview('desired_job_type').oldValue).join(', ')
                          : '-'}
                      </Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {parseArrayField(getChangePreview('desired_job_type').newValue).length > 0
                          ? parseArrayField(getChangePreview('desired_job_type').newValue).join(', ')
                          : '-'}
                      </Text>
                    </div>
                  ) : (
                    <span>
                      {parseArrayField(displayCustomer.desired_job_type).length > 0
                        ? parseArrayField(displayCustomer.desired_job_type).join(', ')
                        : '-'}
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="希望業種">
                  {getChangePreview('desired_industry') ? (
                    <div>
                      <Text delete type="secondary">
                        {parseArrayField(getChangePreview('desired_industry').oldValue).length > 0
                          ? parseArrayField(getChangePreview('desired_industry').oldValue).join(', ')
                          : '-'}
                      </Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {parseArrayField(getChangePreview('desired_industry').newValue).length > 0
                          ? parseArrayField(getChangePreview('desired_industry').newValue).join(', ')
                          : '-'}
                      </Text>
                    </div>
                  ) : (
                    <span>
                      {parseArrayField(displayCustomer.desired_industry).length > 0
                        ? parseArrayField(displayCustomer.desired_industry).join(', ')
                        : '-'}
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="希望年収">
                  {getChangePreview('desired_salary') ? (
                    <div>
                      <Text delete type="secondary">{getChangePreview('desired_salary').oldValue}万円</Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {getChangePreview('desired_salary').newValue}万円
                      </Text>
                    </div>
                  ) : (
                    <span>{displayCustomer.desired_salary ? `${displayCustomer.desired_salary}万円` : '-'}</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="希望勤務地">
                  {getChangePreview('desired_work_location') ? (
                    <div>
                      <Text delete type="secondary">{getChangePreview('desired_work_location').oldValue}</Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {getChangePreview('desired_work_location').newValue}
                      </Text>
                    </div>
                  ) : (
                    <span>{displayCustomer.desired_work_location || '-'}</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="最終学歴">{displayCustomer.final_education || '-'}</Descriptions.Item>
                <Descriptions.Item label="入社可能時期">{displayCustomer.employment_start_period || '-'}</Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '8px 0' }} />

              {/* その他 */}
              <Text strong style={{ color: '#666', fontSize: 12 }}>その他</Text>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="運転免許">
                  {displayCustomer.drivers_license === true ? 'あり' : displayCustomer.drivers_license === false ? 'なし' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="転職理由">
                  {getChangePreview('transfer_reason') ? (
                    <div>
                      <Text delete type="secondary">{getChangePreview('transfer_reason').oldValue || '-'}</Text>
                      <Text> → </Text>
                      <Text strong style={{ backgroundColor: '#fff566', padding: '2px 4px' }}>
                        {getChangePreview('transfer_reason').newValue || '-'}
                      </Text>
                    </div>
                  ) : (
                    <span>{displayCustomer.transfer_reason || '-'}</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>

          {/* ステータスパネル */}
          <Card
            title="ステータス情報"
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="現在のステータス">
                {(() => {
                  const compareData = isPreviewMode ? previewData : livePreviewData;
                  const oldStatus = currentCustomer.statusInfo?.current_status;
                  const newStatus = compareData?.statusInfo?.current_status;
                  const hasStatusChanged = compareData && oldStatus !== newStatus;

                  return hasStatusChanged ? (
                    <div>
                      <Tag>{oldStatus}</Tag>
                      <Text> → </Text>
                      <Tag color="blue" style={{ backgroundColor: '#fff566', padding: '2px 8px' }}>
                        {newStatus}
                      </Tag>
                    </div>
                  ) : (
                    <Tag color="blue">{displayCustomer.statusInfo?.current_status || currentCustomer.statusInfo?.current_status}</Tag>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="優先度">
                <Tag color={
                  (displayCustomer.statusInfo?.priority || currentCustomer.statusInfo?.priority) === '最優先' ? 'red' :
                  (displayCustomer.statusInfo?.priority || currentCustomer.statusInfo?.priority) === '高' ? 'orange' :
                  (displayCustomer.statusInfo?.priority || currentCustomer.statusInfo?.priority) === '中' ? 'blue' : 'default'
                }>
                  {displayCustomer.statusInfo?.priority || currentCustomer.statusInfo?.priority || '中'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="担当者">
                {displayCustomer.statusInfo?.assigned_staff || currentCustomer.statusInfo?.assigned_staff || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最終連絡日">
                {(displayCustomer.statusInfo?.last_contact_date || currentCustomer.statusInfo?.last_contact_date)
                  ? dayjs(displayCustomer.statusInfo?.last_contact_date || currentCustomer.statusInfo?.last_contact_date).format('YYYY-MM-DD')
                  : '未連絡'}
              </Descriptions.Item>
              <Descriptions.Item label="メモ">
                <Text type="warning">{displayCustomer.statusInfo?.notes || currentCustomer.statusInfo?.notes || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 架電履歴パネル */}
          <Card
            title={
              <Space>
                <HistoryOutlined />
                架電履歴
              </Space>
            }
          >
            {displayCustomer.callHistories && displayCustomer.callHistories.length > 0 ? (
              <Timeline
                items={[
                  ...displayCustomer.callHistories.map(history => ({
                    color: history.call_result === '接続成功' ? 'green' : (history.call_result ? 'red' : 'blue'),
                    content: (
                      <div style={{
                        backgroundColor: (history.isPreview || history.isLivePreview) ? '#fff566' : 'transparent',
                        padding: (history.isPreview || history.isLivePreview) ? '8px' : '0',
                        borderRadius: (history.isPreview || history.isLivePreview) ? '4px' : '0',
                        marginBottom: '4px'
                      }}>
                        {history.isPreview && (
                          <Tag color="orange" style={{ marginBottom: '4px' }}>新規</Tag>
                        )}
                        {history.isLivePreview && (
                          <Tag color="blue" style={{ marginBottom: '4px' }}>プレビュー</Tag>
                        )}
                        <Text strong>
                          {dayjs(history.call_date).format('YYYY-MM-DD HH:mm')}
                        </Text>
                        <br />
                        <Space>
                          {history.call_type && <Tag>{history.call_type}</Tag>}
                          {history.call_result && (
                            <Tag color={history.call_result === '接続成功' ? 'green' : 'red'}>
                              {history.call_result}
                            </Tag>
                          )}
                        </Space>
                        {history.notes && (
                          <>
                            <br />
                            <Text type="secondary">{history.notes}</Text>
                          </>
                        )}
                        {history.next_action && (
                          <>
                            <br />
                            <Text type="secondary">次回アクション: {history.next_action}</Text>
                          </>
                        )}
                      </div>
                    )
                  })),
                  // データ流入時間を最後に追加
                  {
                    color: 'blue',
                    content: (
                      <div>
                        <Text strong>
                          {displayCustomer.inflow_date
                            ? dayjs(displayCustomer.inflow_date).format('YYYY-MM-DD HH:mm')
                            : '-'}
                        </Text>
                        <br />
                        <Tag color="blue">データ流入</Tag>
                        <br />
                        <Text type="secondary">顧客データが登録されました</Text>
                        {displayCustomer.media && (
                          <>
                            <br />
                            <Text type="secondary">媒体: {displayCustomer.media}</Text>
                          </>
                        )}
                        {displayCustomer.route && (
                          <>
                            <br />
                            <Text type="secondary">経路: {displayCustomer.route}</Text>
                          </>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <>
                <Timeline
                  items={[
                    {
                      color: 'blue',
                      content: (
                        <div>
                          <Text strong>
                            {displayCustomer.inflow_date
                              ? dayjs(displayCustomer.inflow_date).format('YYYY-MM-DD HH:mm')
                              : '-'}
                          </Text>
                          <br />
                          <Tag color="blue">データ流入</Tag>
                          <br />
                          <Text type="secondary">顧客データが登録されました</Text>
                          {displayCustomer.media && (
                            <>
                              <br />
                              <Text type="secondary">媒体: {displayCustomer.media}</Text>
                            </>
                          )}
                          {displayCustomer.route && (
                            <>
                              <br />
                              <Text type="secondary">経路: {displayCustomer.route}</Text>
                            </>
                          )}
                        </div>
                      )
                    }
                  ]}
                />
              </>
            )}
          </Card>
        </Col>

        {/* 右側：架電記録とトークスクリプト */}
        <Col xs={24} lg={16}>
          {/* 架電記録フォーム */}
          <Collapse
            activeKey={activeCallRecord}
            onChange={handleCallRecordChange}
            style={{ marginBottom: 16 }}
            items={[
              {
                key: 'call-record',
                label: '架電記録',
                children: (
                  <Form form={callForm} layout="vertical" disabled={isPreviewMode} onValuesChange={updateLivePreview}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="call_type"
                    label="架電種別"
                    rules={[{ required: true, message: '架電種別を選択してください' }]}
                    initialValue="発信"
                  >
                    <Select size="large">
                      <Option value="発信">発信</Option>
                      <Option value="着信">着信</Option>
                      <Option value="メール">メール</Option>
                      <Option value="その他">その他</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="caller_id"
                    label="架電担当者"
                    rules={[{ required: true, message: '架電担当者を選択してください' }]}
                  >
                    <Select
                      size="large"
                      placeholder="担当者を選択"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {users.map(user => (
                        <Option key={user.id} value={user.id}>
                          {user.displayName}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="call_result"
                label="結果"
                rules={[{ required: true, message: '結果を選択してください' }]}
              >
                <Space wrap size="middle">
                  <Button
                    size="large"
                    type={selectedResult === '接続成功' ? 'primary' : 'default'}
                    onClick={() => handleResultClick('接続成功')}
                    style={{ minWidth: 120 }}
                  >
                    ✅ 接続成功
                  </Button>
                  <Button
                    size="large"
                    type={selectedResult === '不在' ? 'primary' : 'default'}
                    onClick={() => handleResultClick('不在')}
                    style={{ minWidth: 120 }}
                  >
                    ❌ 不在
                  </Button>
                  <Button
                    size="large"
                    type={selectedResult === '留守電' ? 'primary' : 'default'}
                    onClick={() => handleResultClick('留守電')}
                    style={{ minWidth: 120 }}
                  >
                    📞 留守電
                  </Button>
                  <Button
                    size="large"
                    type={selectedResult === '拒否' ? 'primary' : 'default'}
                    onClick={() => handleResultClick('拒否')}
                    style={{ minWidth: 120 }}
                  >
                    🚫 拒否
                  </Button>
                  <Button
                    size="large"
                    type={selectedResult === 'その他' ? 'primary' : 'default'}
                    onClick={() => handleResultClick('その他')}
                    style={{ minWidth: 120 }}
                  >
                    その他
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item
                name="new_status"
                label="ステータス変更（接続成功時のみ）"
              >
                <Space wrap size="small">
                  <Button
                    size="small"
                    type={selectedStatus === '未接触' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('未接触')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    未接触
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '接触中' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('接触中')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    接触中
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '面談設定済' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('面談設定済')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    面談設定済
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '面談済' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('面談済')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    面談済
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '求人提案中' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('求人提案中')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    求人提案中
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '応募承諾' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('応募承諾')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    応募承諾
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '選考中' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('選考中')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    選考中
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '内定' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('内定')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    内定
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '入社決定' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('入社決定')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    入社決定
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '保留' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('保留')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    保留
                  </Button>
                  <Button
                    size="small"
                    type={selectedStatus === '断念' ? 'primary' : 'default'}
                    onClick={() => handleStatusClick('断念')}
                    disabled={selectedResult !== '接続成功' || isPreviewMode}
                  >
                    断念
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item
                name="notes"
                label="メモ"
              >
                <TextArea
                  rows={6}
                  placeholder="通話内容、顧客の反応、次回のアクションなどを記録..."
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="next_action"
                label="次回アクション"
              >
                <Input size="large" placeholder="例：求人紹介、面談設定、資料送付" />
              </Form.Item>

              <Form.Item
                name="next_contact_date"
                label="次回連絡予定日"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  size="large"
                  showTime
                />
              </Form.Item>
            </Form>
                )
              }
            ]}
          />

          {/* ヒアリング項目パネル */}
          <Collapse
            activeKey={activeHearing}
            onChange={handleHearingChange}
            items={[
              {
                key: 'hearing',
                label: (
                  <Space>
                    <EditOutlined />
                    ヒアリング項目
                  </Space>
                ),
                children: (
                  <Form form={hearingForm} layout="vertical" size="small" disabled={isPreviewMode} onValuesChange={updateLivePreview}>
              {/* 職務情報 */}
              <Divider orientation="left" style={{ margin: '8px 0', fontSize: 12 }}>職務情報</Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="current_company" label="現職（会社名）">
                    <Input placeholder="例: 株式会社〇〇" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="current_job_type" label="現職種">
                    <Input placeholder="例: 営業" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="current_salary" label="現年収（万円）">
                    <Input type="number" placeholder="例: 450" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="company_experience_count" label="社数経験">
                    <Input type="number" placeholder="例: 3" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="final_education" label="最終学歴">
                    <Select placeholder="選択" allowClear>
                      <Option value="中学卒">中学卒</Option>
                      <Option value="高校卒">高校卒</Option>
                      <Option value="専門学校卒">専門学校卒</Option>
                      <Option value="短大卒">短大卒</Option>
                      <Option value="大学卒">大学卒</Option>
                      <Option value="大学院卒">大学院卒</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="job_change_schedule" label="転職希望時期">
                    <Select placeholder="選択" allowClear>
                      <Option value="すぐにでも">すぐにでも</Option>
                      <Option value="1ヶ月以内">1ヶ月以内</Option>
                      <Option value="3ヶ月以内">3ヶ月以内</Option>
                      <Option value="6ヶ月以内">6ヶ月以内</Option>
                      <Option value="1年以内">1年以内</Option>
                      <Option value="未定">未定</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="job_change_status" label="転職活動状況">
                    <Select placeholder="選択" allowClear>
                      <Option value="情報収集中">情報収集中</Option>
                      <Option value="積極的に活動中">積極的に活動中</Option>
                      <Option value="良い案件があれば">良い案件があれば</Option>
                      <Option value="内定保有">内定保有</Option>
                      <Option value="活動休止中">活動休止中</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="employment_start_period" label="入社可能時期">
                    <Select placeholder="選択" allowClear>
                      <Option value="即日">即日</Option>
                      <Option value="2週間以内">2週間以内</Option>
                      <Option value="1ヶ月以内">1ヶ月以内</Option>
                      <Option value="2ヶ月以内">2ヶ月以内</Option>
                      <Option value="3ヶ月以内">3ヶ月以内</Option>
                      <Option value="応相談">応相談</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* 希望条件 */}
              <Divider orientation="left" style={{ margin: '8px 0', fontSize: 12 }}>希望条件</Divider>
              <Form.Item name="desired_job_type" label="希望職種（複数選択可）">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space size="small">
                    <Button
                      size="small"
                      onClick={handleJobTypeSelectAll}
                      disabled={isPreviewMode}
                    >
                      全選択
                    </Button>
                    <Button
                      size="small"
                      onClick={handleJobTypeClearAll}
                      disabled={isPreviewMode}
                    >
                      全解除
                    </Button>
                  </Space>
                  <Space wrap size="small">
                    {JOB_TYPE_OPTIONS.map(jobType => (
                      <Button
                        key={jobType}
                        size="small"
                        type={selectedJobTypes.includes(jobType) ? 'primary' : 'default'}
                        onClick={() => handleJobTypeToggle(jobType)}
                        disabled={isPreviewMode}
                      >
                        {jobType}
                      </Button>
                    ))}
                  </Space>
                </Space>
              </Form.Item>
              <Form.Item name="desired_industry" label="希望業種（複数選択可）">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space size="small">
                    <Button
                      size="small"
                      onClick={handleIndustrySelectAll}
                      disabled={isPreviewMode}
                    >
                      全選択
                    </Button>
                    <Button
                      size="small"
                      onClick={handleIndustryClearAll}
                      disabled={isPreviewMode}
                    >
                      全解除
                    </Button>
                  </Space>
                  <Space wrap size="small">
                    {INDUSTRY_OPTIONS.map(industry => (
                      <Button
                        key={industry}
                        size="small"
                        type={selectedIndustries.includes(industry) ? 'primary' : 'default'}
                        onClick={() => handleIndustryToggle(industry)}
                        disabled={isPreviewMode}
                      >
                        {industry}
                      </Button>
                    ))}
                  </Space>
                </Space>
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="desired_salary" label="希望年収（万円）">
                    <Input type="number" placeholder="例: 550" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="desired_work_location" label="希望勤務地">
                    <Input placeholder="例: 東京都" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="transfer_reason" label="転職理由・きっかけ">
                <TextArea rows={3} placeholder="転職を考えられたきっかけや理由を記入..." />
              </Form.Item>

              {/* その他 */}
              <Divider orientation="left" style={{ margin: '8px 0', fontSize: 12 }}>その他</Divider>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="drivers_license" label="運転免許">
                    <Select placeholder="選択" allowClear>
                      <Option value={true}>あり</Option>
                      <Option value={false}>なし</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="available_time" label="繋がりやすい時間帯">
                    <Input placeholder="例: 平日18時以降、土日終日" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
                )
              }
            ]}
          />

          {/* 求人情報パネル */}
          <Collapse
            activeKey={activeJobs}
            onChange={handleJobsChange}
            items={[
              {
                key: 'jobs',
                label: (
                  <Space>
                    <TrophyOutlined />
                    マッチング求人
                  </Space>
                ),
                children: (
                  <List
                    dataSource={jobs}
                    locale={{ emptyText: 'この顧客に合致する求人がありません' }}
                    renderItem={(job) => (
                      <List.Item key={job.id} style={{ padding: '12px 0' }}>
                        <Card
                          size="small"
                          style={{ width: '100%', cursor: 'pointer' }}
                          hoverable
                          onClick={() => handleJobClick(job)}
                        >
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {/* マッチスコアとタグ */}
                            <Space wrap>
                              <Badge
                                count={`${job.matchScore}%`}
                                style={{
                                  backgroundColor: job.matchScore >= 90 ? '#52c41a' : job.matchScore >= 80 ? '#1890ff' : '#faad14'
                                }}
                              />
                              <Tag color="blue">{job.jobType}</Tag>
                              <Tag color="purple">{job.industry}</Tag>
                            </Space>

                            {/* 求人タイトルと会社名 */}
                            <div>
                              <Text strong style={{ fontSize: 16 }}>{job.title}</Text>
                              <br />
                              <Text type="secondary">{job.company}</Text>
                            </div>

                            {/* 給与と勤務地 */}
                            <Space split={<Divider type="vertical" />}>
                              <Text>💰 {job.salary}</Text>
                              <Text>📍 {job.location}</Text>
                            </Space>

                            {/* 求人説明 */}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {job.description}
                            </Text>
                          </Space>
                        </Card>
                      </List.Item>
                    )}
                  />
                )
              }
            ]}
          />
        </Col>
      </Row>

      {/* 求人詳細モーダル */}
      <Modal
        title={
          <Space>
            <TrophyOutlined />
            求人詳細
          </Space>
        }
        open={isJobModalVisible}
        onCancel={handleJobModalClose}
        width={700}
        footer={[
          <Button key="close" onClick={handleJobModalClose}>
            閉じる
          </Button>,
          <Button key="recommend" type="primary">
            この求人を紹介する
          </Button>,
        ]}
      >
        {selectedJob && (
          <div>
            {/* マッチスコア */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Badge
                count={`マッチ度: ${selectedJob.matchScore}%`}
                style={{
                  backgroundColor: selectedJob.matchScore >= 90 ? '#52c41a' : selectedJob.matchScore >= 80 ? '#1890ff' : '#faad14',
                  fontSize: 16,
                  padding: '8px 16px',
                  height: 'auto'
                }}
              />
            </div>

            {/* 求人タイトルと会社名 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 8 }}>{selectedJob.title}</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>{selectedJob.company}</Text>
            </div>

            <Divider />

            {/* 求人情報 */}
            <Descriptions column={1} bordered>
              <Descriptions.Item label={<><DollarOutlined /> 年収</>}>
                <Text strong style={{ fontSize: 16 }}>{selectedJob.salary}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> 勤務地</>}>
                <Text strong>{selectedJob.location}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="職種">
                <Tag color="blue">{selectedJob.jobType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="業種">
                <Tag color="purple">{selectedJob.industry}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="仕事内容" span={2}>
                <Text>{selectedJob.description}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* 顧客との適合性 */}
            <Card title="顧客との適合性" size="small" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">現職種:</Text>{' '}
                  <Text>{displayCustomer.current_job_type}</Text>
                  {' → '}
                  <Text strong>希望職種: {parseArrayField(displayCustomer.desired_job_type).join(', ') || '-'}</Text>
                </div>
                <div>
                  <Text type="secondary">現年収:</Text>{' '}
                  <Text>{displayCustomer.current_salary}万円</Text>
                  {' → '}
                  <Text strong>希望年収: {displayCustomer.desired_salary}万円</Text>
                </div>
                <div>
                  <Text type="secondary">希望勤務地:</Text>{' '}
                  <Text strong>{displayCustomer.desired_work_location}</Text>
                </div>
              </Space>
            </Card>

            {/* 通勤ルート */}
            <Card title="通勤ルート" size="small" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">現住所: </Text>
                <Text>{displayCustomer.address}</Text>
                <br />
                <Text type="secondary">勤務地: </Text>
                <Text strong>{selectedJob.location}</Text>
              </div>
              <iframe
                width="100%"
                height="350"
                style={{ border: 0, borderRadius: 4 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${encodeURIComponent(displayCustomer.address)}&destination=${encodeURIComponent(selectedJob.location)}&mode=transit`}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                <Text type="secondary">※ 公共交通機関を利用した場合のルートを表示しています</Text>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* 固定フッター */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 16px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        zIndex: 100,
      }}
      className="call-work-footer"
      >
        <Space size="middle" wrap style={{ width: '100%', justifyContent: 'center' }}>
          {!isPreviewMode && !isCallActive && (
            <Button
              type="primary"
              size="large"
              icon={<PhoneFilled />}
              onClick={startCall}
              style={{ minWidth: 140 }}
            >
              架電開始
            </Button>
          )}
          {!isPreviewMode && isCallActive && (
            <Button
              danger
              size="large"
              icon={<StopOutlined />}
              onClick={endCall}
              style={{ minWidth: 140 }}
            >
              通話終了
            </Button>
          )}
          {!isPreviewMode && (
            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={handlePreview}
              style={{ minWidth: 140 }}
            >
              変更プレビュー
            </Button>
          )}
          {!isPreviewMode && (
            <Button
              size="large"
              icon={<StepForwardOutlined />}
              onClick={handleSkip}
              style={{ minWidth: 120 }}
            >
              スキップ
            </Button>
          )}
          {isPreviewMode && (
            <>
              <Button
                size="large"
                icon={<EditOutlined />}
                onClick={handleCancelPreview}
                style={{ minWidth: 140 }}
              >
                編集に戻る
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSaveAndNext}
                style={{ minWidth: 160, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                保存して次へ
              </Button>
            </>
          )}
        </Space>
      </div>
    </div>
  );
}
