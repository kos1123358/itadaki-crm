-- Update status_type ENUM to new simplified statuses

-- Drop the old ENUM type and create a new one
-- First, we need to drop the dependent column, then the type, then recreate both

-- Step 1: Add a temporary column with the new type
ALTER TABLE statuses ADD COLUMN current_status_new VARCHAR(50);

-- Step 2: Copy data from old column to new column
UPDATE statuses SET current_status_new =
  CASE current_status::text
    WHEN '新規登録' THEN '未接触'
    WHEN '初回コンタクト待ち' THEN '接触中'
    WHEN '初回面談済み' THEN '面談済'
    WHEN '求人紹介中' THEN '求人提案中'
    WHEN '応募準備中' THEN '応募承諾'
    WHEN '書類選考中' THEN '選考中'
    WHEN '面接調整中' THEN '選考中'
    WHEN '一次面接済み' THEN '選考中'
    WHEN '二次面接済み' THEN '選考中'
    WHEN '最終面接済み' THEN '選考中'
    WHEN '内定' THEN '内定'
    WHEN '入社決定' THEN '入社決定'
    WHEN '保留中' THEN '保留'
    WHEN '辞退' THEN '断念'
    WHEN '不採用' THEN '断念'
    WHEN '休眠' THEN '断念'
    ELSE '未接触'
  END;

-- Step 3: Drop the old column
ALTER TABLE statuses DROP COLUMN current_status;

-- Step 4: Drop the old ENUM type with CASCADE to remove dependencies
DROP TYPE IF EXISTS status_type CASCADE;

-- Step 5: Create new ENUM type with simplified statuses
CREATE TYPE status_type AS ENUM (
  '未接触',
  '接触中',
  '面談設定済',
  '面談済',
  '求人提案中',
  '応募承諾',
  '選考中',
  '内定',
  '入社決定',
  '保留',
  '断念'
);

-- Step 6: Change the temporary column to use the new ENUM type
ALTER TABLE statuses
  ALTER COLUMN current_status_new TYPE status_type USING current_status_new::status_type;

-- Step 7: Rename the column back to original name
ALTER TABLE statuses RENAME COLUMN current_status_new TO current_status;

-- Step 8: Set NOT NULL constraint and default value
ALTER TABLE statuses ALTER COLUMN current_status SET NOT NULL;
ALTER TABLE statuses ALTER COLUMN current_status SET DEFAULT '未接触';

-- Update status_histories table if exists (for future reference)
COMMENT ON COLUMN statuses.current_status IS '現在のステータス: 未接触/接触中/面談設定済/面談済/求人提案中/応募承諾/選考中/内定/入社決定/保留/断念';
