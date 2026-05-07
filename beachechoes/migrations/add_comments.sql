-- Add comments table for post comments and replies
-- Run this migration against your Neon database

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Constraint: At least one of content or image_url must be present
  CONSTRAINT content_or_image CHECK (
    (content IS NOT NULL AND content <> '') OR
    (image_url IS NOT NULL AND image_url <> '')
  )
);

-- Indexes for efficient queries
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Composite index for fetching comments on a post ordered by time
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);

-- Add comment_count to posts table for performance
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Function to update comment count (for potential triggers)
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update comment count
CREATE TRIGGER trg_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Note: This migration creates the comments table structure.
-- The comment_count will be updated automatically via trigger for new comments.
-- For existing posts, you may want to run an initial count update:
-- UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = posts.id AND NOT is_deleted);
