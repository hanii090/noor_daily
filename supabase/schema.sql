-- =====================================================
-- Noor Daily - Supabase Database Schema
-- =====================================================
-- This schema supports cloud storage for history, exams,
-- and user preferences with offline-first architecture
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & IDENTITY
-- =====================================================
-- Note: We'll use Supabase's built-in auth.users table
-- and support anonymous authentication for privacy

-- =====================================================
-- HISTORY ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS history_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('verse', 'hadith', 'name_of_allah', 'dua')),
  mood TEXT CHECK (mood IN ('grateful', 'seeking_peace', 'anxious', 'joyful', 'reflective', 'struggling')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT unique_user_date_content UNIQUE (user_id, date, content_id)
);

CREATE INDEX IF NOT EXISTS idx_history_user_date ON history_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_timestamp ON history_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_history_mood ON history_entries(user_id, mood) WHERE mood IS NOT NULL;

-- =====================================================
-- EXAM SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timing TEXT NOT NULL CHECK (timing IN ('today', 'tomorrow', 'this_week')),
  subject TEXT NOT NULL,
  feeling TEXT NOT NULL CHECK (feeling IN ('stressed', 'anxious', 'tired', 'confident', 'hopeful')),
  verse_id TEXT NOT NULL,
  exam_verse_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for queries
  CONSTRAINT unique_user_exam_session UNIQUE (user_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_exam_user_created ON exam_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_feeling ON exam_sessions(user_id, feeling);

-- =====================================================
-- USER PREFERENCES (BACKUP)
-- =====================================================
-- Store favorites and settings in cloud for backup
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorites JSONB DEFAULT '[]'::jsonb,
  favorite_hadiths JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- History entries policies
CREATE POLICY "Users can view own history"
  ON history_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON history_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
  ON history_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON history_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Exam sessions policies
CREATE POLICY "Users can view own exams"
  ON exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exams"
  ON exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams"
  ON exam_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams"
  ON exam_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER VIEWS (Optional)
-- =====================================================

-- View for daily statistics
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
  user_id,
  date,
  COUNT(*) as entry_count,
  COUNT(DISTINCT content_type) as content_types,
  array_agg(DISTINCT mood) FILTER (WHERE mood IS NOT NULL) as moods
FROM history_entries
GROUP BY user_id, date;

-- View for mood analytics
CREATE OR REPLACE VIEW mood_analytics AS
SELECT 
  user_id,
  mood,
  COUNT(*) as count,
  MIN(date) as first_occurrence,
  MAX(date) as last_occurrence
FROM history_entries
WHERE mood IS NOT NULL
GROUP BY user_id, mood;
