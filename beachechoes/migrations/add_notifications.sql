-- Add notifications table
-- This migration creates the notifications table for the modular notification system.
-- Supports friend requests, post likes, post expiry, and future notification types.
-- Max 15 notifications per user enforced at application level.

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Index for efficient user notification queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Index for querying unread notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);

-- Index for ordering by created_at
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Valid notification types (documented for reference, enforced at application level):
-- 'friend_request': When a user receives a friend request
--   data: { "from_user_id": <int>, "from_name": <string>, "from_avatar_url": <string|null> }
-- 'post_liked': When another user likes one of their posts
--   data: { "post_id": <int>, "liker_user_id": <int>, "liker_name": <string>, "liker_avatar_url": <string|null> }
-- 'post_expired': When their post expires and is deleted
--   data: { "post_id": <int>, "overlay_text": <string> }

-- Migration Status: NOT YET APPLIED
-- To apply: Run this SQL against your Neon database, then mark as applied in this comment.
