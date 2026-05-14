-- Narrow friend-request notification dedupe to active pending requests only.
-- This allows accepted/read friend_request history to coexist with a new reverse request.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS idx_notifications_friend_request_unique;
DROP INDEX IF EXISTS idx_notifications_friend_request_unique;

WITH ranked_pending_requests AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, from_user_id, type
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM notifications
  WHERE type = 'friend_request'
    AND read = FALSE
    AND from_user_id IS NOT NULL
    AND (data->>'accepted') IS NULL
)
UPDATE notifications
SET read = TRUE
WHERE id IN (
  SELECT id
  FROM ranked_pending_requests
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_friend_request_unique
ON notifications (user_id, from_user_id, type)
WHERE type = 'friend_request'
  AND read = FALSE
  AND from_user_id IS NOT NULL
  AND (data->>'accepted') IS NULL;
