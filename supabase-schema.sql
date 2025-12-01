-- Itadaki CRM Supabase Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE gender_type AS ENUM ('男性', '女性', 'その他');
CREATE TYPE status_type AS ENUM (
  '新規登録',
  '初回コンタクト待ち',
  '初回面談済み',
  '求人紹介中',
  '応募準備中',
  '書類選考中',
  '面接調整中',
  '一次面接済み',
  '二次面接済み',
  '最終面接済み',
  '内定',
  '入社決定',
  '保留中',
  '辞退',
  '不採用',
  '休眠'
);
CREATE TYPE priority_type AS ENUM ('低', '中', '高', '最優先');
CREATE TYPE call_type AS ENUM ('発信', '着信', 'メール', 'その他');
CREATE TYPE call_result_type AS ENUM ('接続成功', '不在', '留守電', '拒否', 'その他');

-- Customers Table
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  media VARCHAR(255),
  route VARCHAR(255),
  inflow_date TIMESTAMP WITH TIME ZONE,
  name VARCHAR(255) NOT NULL,
  furigana VARCHAR(255),
  gender gender_type,
  age INTEGER,
  address VARCHAR(255),
  phone_number VARCHAR(255),
  company_experience_count INTEGER,
  current_salary INTEGER,
  current_job_type VARCHAR(255),
  job_change_schedule VARCHAR(255),
  job_change_status VARCHAR(255),
  desired_salary INTEGER,
  desired_work_location VARCHAR(255),
  desired_industry VARCHAR(255),
  desired_job_type VARCHAR(255),
  final_education VARCHAR(255),
  employment_start_period VARCHAR(255),
  current_company VARCHAR(255),
  drivers_license BOOLEAN DEFAULT FALSE,
  status VARCHAR(255),
  available_time VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Statuses Table
CREATE TABLE statuses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  current_status status_type NOT NULL DEFAULT '新規登録',
  status_updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  assigned_staff VARCHAR(255),
  priority priority_type DEFAULT '中',
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Histories Table
CREATE TABLE call_histories (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  call_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  call_type call_type NOT NULL,
  call_result call_result_type,
  duration INTEGER,
  notes TEXT,
  next_action VARCHAR(255),
  next_contact_date TIMESTAMP WITH TIME ZONE,
  staff_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status Histories Table
CREATE TABLE status_histories (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  previous_status status_type,
  new_status status_type NOT NULL,
  previous_priority priority_type,
  new_priority priority_type,
  previous_assigned_staff VARCHAR(255),
  new_assigned_staff VARCHAR(255),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_statuses_customer_id ON statuses(customer_id);
CREATE INDEX idx_call_histories_customer_id ON call_histories(customer_id);
CREATE INDEX idx_call_histories_call_date ON call_histories(call_date DESC);
CREATE INDEX idx_status_histories_customer_id ON status_histories(customer_id);
CREATE INDEX idx_status_histories_changed_at ON status_histories(changed_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statuses_updated_at
  BEFORE UPDATE ON statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_histories_updated_at
  BEFORE UPDATE ON call_histories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_histories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Customers
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Statuses
CREATE POLICY "Users can view statuses of their customers"
  ON statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = statuses.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert statuses for their customers"
  ON statuses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = statuses.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update statuses of their customers"
  ON statuses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = statuses.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = statuses.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete statuses of their customers"
  ON statuses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = statuses.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- RLS Policies for Call Histories
CREATE POLICY "Users can view call histories of their customers"
  ON call_histories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = call_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert call histories for their customers"
  ON call_histories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = call_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update call histories of their customers"
  ON call_histories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = call_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = call_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete call histories of their customers"
  ON call_histories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = call_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- RLS Policies for Status Histories
CREATE POLICY "Users can view status histories of their customers"
  ON status_histories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = status_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert status histories for their customers"
  ON status_histories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = status_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update status histories of their customers"
  ON status_histories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = status_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = status_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete status histories of their customers"
  ON status_histories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = status_histories.customer_id
      AND customers.user_id = auth.uid()
    )
  );
