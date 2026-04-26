-- Migration: add_posts.sql
-- Adds the posts, post_likes, and post_reports tables for the Map MVP.
-- Run once against the Neon database. Does not modify the existing users table.

-- ── posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  image_url     TEXT    NOT NULL,
  overlay_text  TEXT    NOT NULL DEFAULT '',
  category      TEXT    NOT NULL DEFAULT 'Tips'
                CHECK (category IN ('Tips', 'Events', 'Funny', 'Food', 'Study Spots')),
  is_anonymous  BOOLEAN NOT NULL DEFAULT FALSE,
  map_x         NUMERIC(6,5) NOT NULL CHECK (map_x >= 0 AND map_x <= 1),
  map_y         NUMERIC(6,5) NOT NULL CHECK (map_y >= 0 AND map_y <= 1),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the active map feed (non-deleted posts ordered by recency).
CREATE INDEX IF NOT EXISTS idx_posts_active
  ON posts (created_at DESC)
  WHERE is_deleted = FALSE;

-- ── post_likes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)          -- one like per user per post
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes (post_id);

-- ── post_reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reports (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,          -- e.g. 'spam', 'offensive', 'other'
  details    TEXT,                   -- required when reason = 'other'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post
  ON post_reports (post_id);
