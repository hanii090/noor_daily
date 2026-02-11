-- Create daily_content table to store the selected verse for each day
CREATE TABLE IF NOT EXISTS daily_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  content_type TEXT NOT NULL, -- 'verse', 'hadith', etc.
  content_id TEXT NOT NULL,
  content_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by date
CREATE INDEX IF NOT EXISTS idx_daily_content_date ON daily_content(date);

-- RLS Policies
ALTER TABLE daily_content ENABLE ROW LEVEL SECURITY;

-- Everyone can view daily content
CREATE POLICY "Everyone can view daily content"
  ON daily_content
  FOR SELECT
  USING (true);

-- Only service role can insert/update (for Edge Functions)
CREATE POLICY "Service role can manage daily content"
  ON daily_content
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant access
GRANT SELECT ON daily_content TO authenticated, anon;
GRANT ALL ON daily_content TO service_role;
