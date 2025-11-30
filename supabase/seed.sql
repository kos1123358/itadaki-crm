-- Seed data for testing

-- Insert test user (using a test UUID)
-- Note: In production, users should be created through Supabase Auth
-- For local testing, we'll use a demo user ID

-- Test user ID (you can change this to match your actual auth user)
-- To get your actual user ID, sign up in the app and check auth.users table

-- Insert test customers
INSERT INTO customers (
  user_id,
  email,
  name,
  furigana,
  gender,
  age,
  phone_number,
  address,
  current_company,
  current_job_type,
  current_salary,
  desired_job_type,
  desired_industry,
  desired_salary,
  desired_work_location,
  available_time,
  media,
  route,
  inflow_date
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- テスト用UUID（実際のauth.users.idに置き換えてください）
    'test1@example.com',
    '佐藤花子',
    'さとうはなこ',
    '女性',
    32,
    '080-1111-2222',
    '東京都渋谷区渋谷1-1-1',
    '株式会社テスト商事',
    '営業',
    450,
    'マーケティング',
    'IT・Web',
    550,
    '東京都',
    '平日19時以降、土日終日',
    'リクナビ',
    'Web応募',
    '2025-11-20'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'test2@example.com',
    '鈴木一郎',
    'すずきいちろう',
    '男性',
    28,
    '090-2222-3333',
    '大阪府大阪市北区梅田1-1-1',
    '株式会社システムズ',
    'エンジニア',
    500,
    'プロジェクトマネージャー',
    'IT・Web',
    650,
    '大阪府',
    '平日18時以降',
    'マイナビ',
    'エージェント紹介',
    '2025-11-22'
  );

-- Insert statuses for test customers
INSERT INTO statuses (customer_id, current_status, priority, assigned_staff)
SELECT id, '未接触', '中', '山田太郎'
FROM customers
WHERE email IN ('test1@example.com', 'test2@example.com');

-- Insert test jobs
INSERT INTO jobs (
  user_id,
  title,
  company,
  description,
  salary_min,
  salary_max,
  location,
  job_type,
  industry,
  employment_type,
  is_active
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'マーケティングマネージャー',
    '株式会社テックマーケティング',
    'Webマーケティング戦略の立案・実行をお任せします',
    500,
    700,
    '東京都渋谷区',
    'マーケティング',
    'IT・Web',
    '正社員',
    true
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'デジタルマーケティング担当',
    '株式会社グロースパートナーズ',
    'SNS・広告運用を中心としたデジタルマーケティング業務',
    450,
    600,
    '東京都港区',
    'マーケティング',
    'IT・Web',
    '正社員',
    true
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'プロジェクトマネージャー',
    '株式会社システムソリューションズ',
    '大規模システム開発プロジェクトのマネジメント',
    600,
    800,
    '大阪府大阪市',
    'プロジェクトマネージャー',
    'IT・Web',
    '正社員',
    true
  );

-- Note: Replace 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' with your actual user ID from auth.users
-- You can get it by:
-- 1. Sign up in the app
-- 2. Run: SELECT id FROM auth.users LIMIT 1;
-- 3. Replace the UUID in this file
-- 4. Run: supabase db reset
