-- Function to find users who missed their daily entry
-- Used by streak-reminder Edge Function

CREATE OR REPLACE FUNCTION get_users_needing_reminder(check_date DATE)
RETURNS TABLE (user_id UUID, push_token TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id, 
    up.push_token
  FROM 
    user_preferences up
  LEFT JOIN 
    history_entries he ON up.user_id = he.user_id AND he.date = check_date
  WHERE 
    up.push_token IS NOT NULL 
    AND he.id IS NULL; -- No entry found for this date
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to service role
GRANT EXECUTE ON FUNCTION get_users_needing_reminder(DATE) TO service_role;
