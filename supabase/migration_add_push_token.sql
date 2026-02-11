-- Add push_token column to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for fast lookup of users with tokens
CREATE INDEX IF NOT EXISTS idx_preferences_push_token 
ON user_preferences(push_token) 
WHERE push_token IS NOT NULL;

-- Security: Users can update their own push token
-- (Existing RLS policies already cover this via UPDATE policy)
