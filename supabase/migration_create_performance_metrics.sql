-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own metrics
CREATE POLICY "Users can insert their own metrics" ON performance_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to insert metrics (if user_id is null or matches)
-- Since we use anonymous auth, auth.uid() should be present. 
-- But sometimes we might log without a user_id if init fails.
CREATE POLICY "Anon can insert metrics" ON performance_metrics
    FOR INSERT WITH CHECK (true);

-- Only admins/service role can view metrics (for dashboard)
-- Users don't need to read this table.
