-- =====================================================
-- Performance Optimization Indexes
-- =====================================================
-- These indexes improve query performance for common access patterns

-- =====================================================
-- HISTORY ENTRIES INDEXES
-- =====================================================

-- Covering index for date-range queries with mood filtering
-- Speeds up: history queries filtered by date and optional mood
CREATE INDEX IF NOT EXISTS idx_history_user_date_mood_covering 
ON history_entries(user_id, date DESC) 
INCLUDE (mood, content_type, content_data, timestamp)
WHERE deleted_at IS NULL;

-- Partial index for recent history (last 30 days)
-- Most queries focus on recent data, this makes them lightning fast
CREATE INDEX IF NOT EXISTS idx_history_recent_30_days
ON history_entries(user_id, date DESC, timestamp DESC)
WHERE date >= CURRENT_DATE - INTERVAL '30 days' 
  AND deleted_at IS NULL;

-- Index for mood analytics
-- Speeds up: mood statistics and mood-based filtering
CREATE INDEX IF NOT EXISTS idx_history_user_mood_date
ON history_entries(user_id, mood, date DESC)
WHERE mood IS NOT NULL AND deleted_at IS NULL;

-- Index for content type queries
-- Speeds up: filtering by specific content types (verse, hadith, etc.)
CREATE INDEX IF NOT EXISTS idx_history_user_content_type
ON history_entries(user_id, content_type, date DESC)
WHERE deleted_at IS NULL;

-- =====================================================
-- EXAM SESSIONS INDEXES
-- =====================================================

-- Covering index for exam queries with feeling analysis
CREATE INDEX IF NOT EXISTS idx_exam_user_created_covering
ON exam_sessions(user_id, created_at DESC)
INCLUDE (timing, subject, feeling, verse_id, exam_verse_category);

-- Index for feeling-based analytics
CREATE INDEX IF NOT EXISTS idx_exam_user_feeling_timing
ON exam_sessions(user_id, feeling, timing)
INCLUDE (verse_id, created_at);

-- Partial index for recent exams (last 90 days)
CREATE INDEX IF NOT EXISTS idx_exam_recent_90_days
ON exam_sessions(user_id, created_at DESC)
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- =====================================================
-- USER PREFERENCES INDEXES
-- =====================================================

-- GIN index for favorites array queries
-- Speeds up: checking if item is in favorites
CREATE INDEX IF NOT EXISTS idx_preferences_favorites_gin
ON user_preferences USING GIN (favorites);

-- GIN index for favorite_hadiths array queries
CREATE INDEX IF NOT EXISTS idx_preferences_favorite_hadiths_gin
ON user_preferences USING GIN (favorite_hadiths);

-- GIN index for settings JSONB queries
-- Speeds up: searching within settings object
CREATE INDEX IF NOT EXISTS idx_preferences_settings_gin
ON user_preferences USING GIN (settings);

-- =====================================================
-- MONITORING TABLES (for new logging/metrics features)
-- =====================================================

-- Create tables for logging and metrics if they don't exist
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  service TEXT,
  action TEXT,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for logging queries
CREATE INDEX IF NOT EXISTS idx_logs_timestamp 
ON app_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_level_user 
ON app_logs(level, user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_service_action
ON app_logs(service, action, timestamp DESC);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
ON performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_operation
ON performance_metrics(operation, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_slow_queries
ON performance_metrics(duration_ms DESC)
WHERE duration_ms > 1000;

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own logs
CREATE POLICY "Users can insert own logs"
ON app_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to view own logs (and admins to view all)
CREATE POLICY "Users can view own logs"
ON app_logs FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to insert their own metrics
CREATE POLICY "Users can insert own metrics"
ON performance_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to view own metrics
CREATE POLICY "Users can view own metrics"
ON performance_metrics FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- ANALYZE TABLES
-- =====================================================
-- Update statistics for query planner

ANALYZE history_entries;
ANALYZE exam_sessions;
ANALYZE user_preferences;
