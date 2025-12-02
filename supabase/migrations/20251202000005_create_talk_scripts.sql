-- トークスクリプト管理テーブル
CREATE TABLE talk_scripts (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_talk_scripts_category ON talk_scripts(category);
CREATE INDEX idx_talk_scripts_is_active ON talk_scripts(is_active);
CREATE INDEX idx_talk_scripts_sort_order ON talk_scripts(sort_order);

-- RLS有効化
ALTER TABLE talk_scripts ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー向けRLSポリシー
CREATE POLICY "Authenticated users can view talk_scripts"
  ON talk_scripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert talk_scripts"
  ON talk_scripts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update talk_scripts"
  ON talk_scripts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete talk_scripts"
  ON talk_scripts FOR DELETE
  TO authenticated
  USING (true);

-- 更新日時の自動更新トリガー
CREATE TRIGGER update_talk_scripts_updated_at
  BEFORE UPDATE ON talk_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ挿入
INSERT INTO talk_scripts (title, category, content, description, sort_order) VALUES
('初回架電：挨拶', '初回架電', E'お世話になっております。\n〇〇エージェントの△△と申します。\n\nこの度は弊社サービスにご登録いただき、誠にありがとうございます。\n\n本日は、ご登録いただいた内容の確認と、今後のサポートについてご説明させていただければと思いお電話いたしました。\n\n今、5分ほどお時間よろしいでしょうか？', '初回架電時の挨拶', 1),

('初回架電：転職理由ヒアリング', '初回架電', E'【転職理由の確認】\n\n差し支えなければ、今回転職を考えられたきっかけやご理由をお聞かせいただけますか？\n\n▼よくある回答と深掘り\n・給与面 → 具体的にどのくらいを希望されていますか？\n・キャリアアップ → どのような経験やスキルを身につけたいとお考えですか？\n・人間関係 → 次の職場ではどのような環境を希望されますか？\n・残業/休日 → ワークライフバランスで重視されることは？', '転職理由のヒアリング', 2),

('初回架電：希望条件ヒアリング', '初回架電', E'【希望条件の確認】\n\n次のお仕事について、いくつかご希望をお伺いします。\n\n■ 職種について\n「どのような職種をご希望ですか？」\n「今までのご経験を活かしたいですか？それとも新しい分野にチャレンジされたいですか？」\n\n■ 勤務地について\n「勤務地のご希望はございますか？」\n「転勤の可能性があるお仕事でも大丈夫ですか？」\n\n■ 年収について\n「ご希望の年収はございますか？」\n「最低ラインとしてはどのくらいをお考えですか？」\n\n■ 入社時期について\n「いつ頃からお仕事開始が可能ですか？」', '希望条件のヒアリング', 3),

('初回架電：クロージング', '初回架電', E'【次回アクションの確認】\n\nありがとうございます。ご状況とご希望について理解できました。\n\n▼面談設定の場合\n「一度、オンラインまたはお電話で詳しくお話をお伺いできればと思います。\nご都合の良い日時はございますか？」\n\n▼求人紹介の場合\n「いくつかご経験・ご希望に合いそうな求人がございますので、\nメールでお送りさせていただいてもよろしいでしょうか？」\n\n▼次回連絡の場合\n「それでは、〇日頃に改めてご連絡させていただきます。\nその際に詳しいお話をお伺いできればと思います。」\n\n本日はお時間いただきありがとうございました。\n引き続きよろしくお願いいたします。', '初回架電のクロージング', 4),

('不在時：留守電メッセージ', '不在対応', E'お世話になっております。\n〇〇エージェントの△△と申します。\n\nこの度はご登録いただきありがとうございます。\n登録内容の確認のためお電話いたしました。\n\n改めてご連絡させていただきますので、\nもしお手すきの際にはXXX-XXXX-XXXXまで\n折り返しいただければ幸いです。\n\n失礼いたします。', '留守電時のメッセージ', 10),

('折り返し対応', '不在対応', E'お電話ありがとうございます。\n〇〇エージェントの△△でございます。\n\n先ほどはお電話いただきありがとうございました。\n弊社サービスにご登録いただいた件でご連絡しておりました。\n\n今、少しお時間よろしいでしょうか？', '折り返しいただいた時の対応', 11),

('面談日程調整', '面談設定', E'【面談日程の調整】\n\n詳しいお話をお伺いするため、一度面談のお時間をいただければと思います。\n\n■ 形式\n「オンライン（Zoom/Teams）またはお電話、どちらがご都合よろしいでしょうか？」\n\n■ 日程\n「来週でご都合の良い日時はございますか？」\n「午前と午後ではどちらがご都合よろしいですか？」\n\n■ 所要時間\n「面談は30分〜1時間程度を予定しております」\n\n■ 確認\n「では、〇月〇日（〇）〇時から、〇〇でお願いいたします。\n前日にリマインドのご連絡をさせていただきます。」', '面談日程の調整', 20);

COMMENT ON TABLE talk_scripts IS 'トークスクリプト管理テーブル';
COMMENT ON COLUMN talk_scripts.title IS 'スクリプトタイトル';
COMMENT ON COLUMN talk_scripts.category IS 'カテゴリ（初回架電、面談設定など）';
COMMENT ON COLUMN talk_scripts.content IS 'スクリプト本文';
COMMENT ON COLUMN talk_scripts.description IS '説明・補足';
COMMENT ON COLUMN talk_scripts.sort_order IS '表示順';
COMMENT ON COLUMN talk_scripts.is_active IS '有効フラグ';
