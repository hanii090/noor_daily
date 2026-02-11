-- Migration: Fix mood constraint to match app values
-- Run this in your Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE history_entries 
DROP CONSTRAINT IF EXISTS history_entries_mood_check;

-- Add new constraint with correct mood values
ALTER TABLE history_entries 
ADD CONSTRAINT history_entries_mood_check 
CHECK (mood IN ('grateful', 'peace', 'strength', 'guidance', 'celebrating', 'anxious', 'sad', 'hopeful'));
