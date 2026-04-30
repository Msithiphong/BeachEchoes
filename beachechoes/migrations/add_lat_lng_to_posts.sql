-- Migration: Add latitude and longitude columns to posts table
-- Date: 2026-04-29
-- Purpose: Store GPS coordinates for "You Are Here" location feature

-- Add latitude and longitude columns to posts table
ALTER TABLE posts
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN posts.latitude IS 'GPS latitude coordinate of the post location';
COMMENT ON COLUMN posts.longitude IS 'GPS longitude coordinate of the post location';

-- Note: These columns are optional and can be NULL
-- Posts created before this migration will have NULL values
-- Posts created with the "You Are Here" feature will have lat/lng values
