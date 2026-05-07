-- Add like_count to comments table for reply sorting
-- This is a stub column for future comment like functionality
-- For now, defaults to 0 to enable sorting by likes

ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

-- Index for efficient sorting by like_count
CREATE INDEX IF NOT EXISTS idx_comments_like_count ON comments(like_count DESC);
