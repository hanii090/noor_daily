-- =====================================================
-- Soft Delete Migration
-- =====================================================
-- Add soft delete support to allow data recovery

-- Add deleted_at column to history_entries
ALTER TABLE history_entries 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to exam_sessions
ALTER TABLE exam_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =====================================================
-- Update RLS Policies to Exclude Soft-Deleted Rows
-- =====================================================

-- Drop existing policies for history_entries
DROP POLICY IF EXISTS "Users can view own history" ON history_entries;
DROP POLICY IF EXISTS "Users can insert own history" ON history_entries;
DROP POLICY IF EXISTS "Users can update own history" ON history_entries;
DROP POLICY IF EXISTS "Users can delete own history" ON history_entries;

-- Recreate policies with deleted_at filter
CREATE POLICY "Users can view own active history"
ON history_entries FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own history"
ON history_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
ON history_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own history"
ON history_entries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop existing policies for exam_sessions
DROP POLICY IF EXISTS "Users can view own exams" ON exam_sessions;
DROP POLICY IF EXISTS "Users can insert own exams" ON exam_sessions;
DROP POLICY IF EXISTS "Users can update own exams" ON exam_sessions;
DROP POLICY IF EXISTS "Users can delete own exams" ON exam_sessions;

-- Recreate policies with deleted_at filter
CREATE POLICY "Users can view own active exams"
ON exam_sessions FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own exams"
ON exam_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams"
ON exam_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own exams"
ON exam_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Soft Delete Helper Functions
-- =====================================================

-- Function to soft delete a history entry
CREATE OR REPLACE FUNCTION soft_delete_history_entry(entry_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE history_entries
  SET deleted_at = NOW()
  WHERE id = entry_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted history entry
CREATE OR REPLACE FUNCTION restore_history_entry(entry_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE history_entries
  SET deleted_at = NULL
  WHERE id = entry_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted entries (cleanup)
CREATE OR REPLACE FUNCTION cleanup_deleted_entries(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM history_entries
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION soft_delete_history_entry(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restore_history_entry(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_deleted_entries(INTEGER) TO authenticated;

-- =====================================================
-- Update existing functions to respect soft deletes
-- =====================================================

-- Already handled in the functions since they filter by deleted_at IS NULL
-- via the views and RLS policies
