-- statuses と call_histories テーブルのRLSポリシーを修正
-- user_idベースのポリシーから認証済みユーザーベースに変更
-- （CRMは共有システムのため、認証済みであれば全データにアクセス可能とする）

-- statuses テーブルのRLSポリシーを修正
DROP POLICY IF EXISTS "Users can view statuses of their customers" ON statuses;
DROP POLICY IF EXISTS "Users can insert statuses for their customers" ON statuses;
DROP POLICY IF EXISTS "Users can update statuses of their customers" ON statuses;
DROP POLICY IF EXISTS "Users can delete statuses of their customers" ON statuses;

CREATE POLICY "Authenticated users can view statuses"
  ON statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert statuses"
  ON statuses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update statuses"
  ON statuses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete statuses"
  ON statuses FOR DELETE
  TO authenticated
  USING (true);

-- call_histories テーブルのRLSポリシーも修正
DROP POLICY IF EXISTS "Users can view call histories of their customers" ON call_histories;
DROP POLICY IF EXISTS "Users can insert call histories for their customers" ON call_histories;
DROP POLICY IF EXISTS "Users can update call histories of their customers" ON call_histories;
DROP POLICY IF EXISTS "Users can delete call histories of their customers" ON call_histories;

CREATE POLICY "Authenticated users can view call_histories"
  ON call_histories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call_histories"
  ON call_histories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update call_histories"
  ON call_histories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete call_histories"
  ON call_histories FOR DELETE
  TO authenticated
  USING (true);

-- コメント追加
COMMENT ON POLICY "Authenticated users can view statuses" ON statuses IS '認証済みユーザーは全てのステータスを閲覧可能';
COMMENT ON POLICY "Authenticated users can insert statuses" ON statuses IS '認証済みユーザーはステータスを登録可能';
COMMENT ON POLICY "Authenticated users can update statuses" ON statuses IS '認証済みユーザーは全てのステータスを更新可能';
COMMENT ON POLICY "Authenticated users can delete statuses" ON statuses IS '認証済みユーザーは全てのステータスを削除可能';

COMMENT ON POLICY "Authenticated users can view call_histories" ON call_histories IS '認証済みユーザーは全ての架電履歴を閲覧可能';
COMMENT ON POLICY "Authenticated users can insert call_histories" ON call_histories IS '認証済みユーザーは架電履歴を登録可能';
COMMENT ON POLICY "Authenticated users can update call_histories" ON call_histories IS '認証済みユーザーは全ての架電履歴を更新可能';
COMMENT ON POLICY "Authenticated users can delete call_histories" ON call_histories IS '認証済みユーザーは全ての架電履歴を削除可能';
