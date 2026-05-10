-- Add viewer-specific hidden posts table
-- Run this migration against your Neon database

CREATE TABLE IF NOT EXISTS user_hidden_posts (
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hidden_posts_user_created
ON user_hidden_posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_hidden_posts_post_id
ON user_hidden_posts(post_id);
