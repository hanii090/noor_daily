-- =====================================================
-- Streak Calculation Function
-- =====================================================
-- Calculates user streak statistics efficiently on the database side
-- instead of fetching all data to the client

CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  total_days INTEGER
) AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_total_days INTEGER := 0;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get total unique days
  SELECT COUNT(DISTINCT date) INTO v_total_days
  FROM history_entries
  WHERE user_id = p_user_id;

  -- Calculate current streak
  WITH RECURSIVE date_series AS (
    -- Check if user has entry today or yesterday
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM history_entries WHERE user_id = p_user_id AND date = v_today) 
        THEN v_today 
        WHEN EXISTS (SELECT 1 FROM history_entries WHERE user_id = p_user_id AND date = v_yesterday)
        THEN v_yesterday
        ELSE NULL
      END AS check_date,
      1 AS streak_count  -- Start at 1 to count the first day
    
    UNION ALL
    
    SELECT 
      (ds.check_date - INTERVAL '1 day')::DATE,
      ds.streak_count + 1
    FROM date_series ds
    WHERE ds.check_date IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM history_entries 
        WHERE user_id = p_user_id 
          AND date = (ds.check_date - INTERVAL '1 day')::DATE
      )
      AND ds.streak_count < 1000  -- Safety limit
  )
  SELECT COALESCE(MAX(streak_count), 0) INTO v_current_streak
  FROM date_series
  WHERE check_date IS NOT NULL;

  -- Calculate longest streak
  WITH date_gaps AS (
    SELECT 
      date,
      date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER * INTERVAL '1 day' AS streak_group
    FROM (
      SELECT DISTINCT date
      FROM history_entries
      WHERE user_id = p_user_id
      ORDER BY date
    ) dates
  ),
  streak_lengths AS (
    SELECT COUNT(*) AS streak_length
    FROM date_gaps
    GROUP BY streak_group
  )
  SELECT COALESCE(MAX(streak_length), 0) INTO v_longest_streak
  FROM streak_lengths;

  -- Return results
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Mood Statistics Function
-- =====================================================
-- Aggregates mood counts efficiently on the database side

CREATE OR REPLACE FUNCTION get_mood_statistics(p_user_id UUID)
RETURNS TABLE (
  mood TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    he.mood::TEXT,
    COUNT(*) AS count
  FROM history_entries he
  WHERE he.user_id = p_user_id
    AND he.mood IS NOT NULL
  GROUP BY he.mood
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Daily History Summary Function
-- =====================================================
-- Get summary of entries for a specific date

CREATE OR REPLACE FUNCTION get_daily_history(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  id UUID,
  content_id TEXT,
  content_type TEXT,
  content_data JSONB,
  mood TEXT,
  entry_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    he.id,
    he.content_id,
    he.content_type,
    he.content_data,
    he.mood::TEXT,
    he.timestamp
  FROM history_entries he
  WHERE he.user_id = p_user_id
    AND he.date = p_date
  ORDER BY he.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- History Dates Function
-- =====================================================
-- Get all dates with history entries (for calendar view)

CREATE OR REPLACE FUNCTION get_history_dates(p_user_id UUID)
RETURNS TABLE (
  date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT he.date
  FROM history_entries he
  WHERE he.user_id = p_user_id
  ORDER BY he.date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Grant Execute Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_streak(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_mood_statistics(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_daily_history(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_history_dates(UUID) TO authenticated, anon;
