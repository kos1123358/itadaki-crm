-- Create status_histories table
CREATE TABLE status_histories (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  previous_status status_type,
  new_status status_type NOT NULL,
  previous_priority priority_type,
  new_priority priority_type,
  previous_assigned_staff VARCHAR(255),
  new_assigned_staff VARCHAR(255),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_status_histories_customer_id ON status_histories(customer_id);
CREATE INDEX idx_status_histories_changed_at ON status_histories(changed_at DESC);

-- Enable RLS
ALTER TABLE status_histories ENABLE ROW LEVEL SECURITY;

-- RLS policies
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
