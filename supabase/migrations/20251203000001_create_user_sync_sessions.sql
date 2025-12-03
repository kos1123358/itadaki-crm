-- User Sync Sessions table for cross-device page synchronization
-- Allows users to sync their current page view across multiple devices

CREATE TABLE user_sync_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_path TEXT NOT NULL DEFAULT '/',
  current_customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  sync_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user_id
CREATE INDEX idx_user_sync_sessions_user_id ON user_sync_sessions(user_id);

-- Enable RLS
ALTER TABLE user_sync_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own sync session
CREATE POLICY "Users can view own sync session"
  ON user_sync_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync session"
  ON user_sync_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync session"
  ON user_sync_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync session"
  ON user_sync_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE user_sync_sessions;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_sync_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sync_sessions_updated_at
  BEFORE UPDATE ON user_sync_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sync_session_timestamp();
