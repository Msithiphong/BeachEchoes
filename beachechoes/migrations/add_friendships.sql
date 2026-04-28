-- Migration: Add friendships table for uni-directional friend request system
-- Status: NOT YET APPLIED (apply this to Neon database if friendships table doesn't exist)

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Prevent self-friendship
ALTER TABLE friendships ADD CONSTRAINT no_self_friendship CHECK (user_id != friend_id);

-- Notes:
-- - Uni-directional design: one row per friend request (user_id = sender, friend_id = recipient)
-- - Status: 'pending' = awaiting response, 'accepted' = friends, 'declined' = request was declined
-- - When declined, the row is kept with status='declined' to allow re-sending
-- - Unique constraint prevents duplicate requests in the same direction
-- - If this table already exists in your database, this migration is informational only
