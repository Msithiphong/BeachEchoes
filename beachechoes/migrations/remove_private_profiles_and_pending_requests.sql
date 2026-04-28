-- Migration: Remove private profile functionality and pending friend requests
-- Execute these SQL statements in your database to clean up the schema

-- 1. Drop profile_visibility column from users table (if it exists)
ALTER TABLE users DROP COLUMN IF EXISTS profile_visibility;

-- 2. Drop status column from friendships table (if it exists)
ALTER TABLE friendships DROP COLUMN IF EXISTS status;

-- 3. Delete all friend_request notifications (no longer used)
DELETE FROM notifications WHERE type = 'friend_request';

-- 4. Drop updated_at from friendships if it was only used for tracking status changes
-- (Optional - only if you don't need this timestamp)
-- ALTER TABLE friendships DROP COLUMN IF EXISTS updated_at;

-- Summary:
-- - Removed profile visibility (public/private) feature
-- - Removed friend request approval system (pending/accepted/declined)
-- - Follows are now instant without approval
-- - Cleaned up obsolete notifications
