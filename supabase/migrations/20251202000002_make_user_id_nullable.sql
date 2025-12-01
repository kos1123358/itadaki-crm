-- user_id の NOT NULL 制約を削除
-- 顧客はメール自動登録時にユーザーなしで作成される可能性があるため

ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN customers.user_id IS '担当ユーザーID（任意）- 後から割り当て可能';
