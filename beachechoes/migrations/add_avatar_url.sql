-- Add avatar_url column to users table
-- Run this SQL in your Neon database console

ALTER TABLE users 
ADD COLUMN avatar_url TEXT;

-- Optional: Add index for faster lookups
CREATE INDEX idx_users_avatar_url ON users(avatar_url);
-- This migration has been added to Neon DB already