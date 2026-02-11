-- Migration: Add content_data column to history_entries
-- Run this in your Supabase SQL Editor to fix the "undefined undefined" issue

ALTER TABLE history_entries 
ADD COLUMN IF NOT EXISTS content_data JSONB;

-- Update comment
COMMENT ON COLUMN history_entries.content_data IS 'Full content object for display (text, translations, etc.)';
