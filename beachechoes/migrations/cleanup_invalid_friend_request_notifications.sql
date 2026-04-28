-- Cleanup: Remove invalid friend_request notifications
-- Date: 2026-04-27
-- Purpose: Delete friend_request notifications missing from_firebase_uid in their data JSONB payload

-- This cleanup addresses notifications created by earlier backend versions that did not include
-- the from_firebase_uid field, which causes "Invalid notification data" errors in the frontend.

DELETE FROM notifications
WHERE type = 'friend_request'
  AND (data->>'from_firebase_uid') IS NULL;

-- After running this cleanup, verify the backend includes from_firebase_uid in all new
-- friend_request notifications (see server.js createNotification calls).
