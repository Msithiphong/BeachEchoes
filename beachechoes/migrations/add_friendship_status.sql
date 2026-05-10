-- Migration: Add status column to friendships table for friend request workflow
-- This migration adds support for pending/accepted/declined friend requests

-- Check if status column exists, if not add it
-- Default existing rows to 'accepted' to maintain current instant-follow behavior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friendships' AND column_name = 'status'
  ) THEN
    ALTER TABLE friendships
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'accepted';
  END IF;
END $$;

-- Update the status column to use a check constraint
ALTER TABLE friendships
DROP CONSTRAINT IF EXISTS friendships_status_check;

ALTER TABLE friendships
ADD CONSTRAINT friendships_status_check
CHECK (status IN ('pending', 'accepted', 'declined'));

-- Add indexes for efficient queries by status
CREATE INDEX IF NOT EXISTS idx_friendships_user_status 
ON friendships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
ON friendships(friend_id, status);

-- Update profile counts to only count accepted friendships
-- This ensures follower/following counts reflect actual accepted connections
-- Note: This is a documentation of the expected behavior
-- Actual queries should filter by status = 'accepted'
