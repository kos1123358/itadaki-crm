-- 顧客削除のRLSポリシーを修正
-- user_idがNULLまたはプレースホルダー（00000000-0000-0000-0000-000000000001）の顧客も削除可能にする

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

-- 認証済みユーザーが全ての顧客を削除できるポリシーに変更
-- （CRMは共有システムのため、認証済みであれば削除可能とする）
CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- 同様に、SELECT/INSERT/UPDATEポリシーも認証済みユーザー向けに更新

-- SELECTポリシーを更新
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- INSERTポリシーを更新
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATEポリシーを更新
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Authenticated users can delete customers" ON customers IS '認証済みユーザーは全ての顧客を削除可能';
COMMENT ON POLICY "Authenticated users can view customers" ON customers IS '認証済みユーザーは全ての顧客を閲覧可能';
COMMENT ON POLICY "Authenticated users can insert customers" ON customers IS '認証済みユーザーは顧客を登録可能';
COMMENT ON POLICY "Authenticated users can update customers" ON customers IS '認証済みユーザーは全ての顧客を更新可能';
