-- Migration: add_post_category.sql
-- Adds a category field to posts for simple tag classification.

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE posts
SET category = 'Tips'
WHERE category IS NULL;

ALTER TABLE posts
ALTER COLUMN category SET DEFAULT 'Tips';

ALTER TABLE posts
ALTER COLUMN category SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_category_check'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_category_check
    CHECK (category IN ('Tips', 'Events', 'Funny', 'Food', 'Study Spots'));
  END IF;
END $$;
