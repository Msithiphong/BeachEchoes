-- Migration: Add from_user_id column to notifications table
-- Purpose: Prevent duplicate friend request notifications between the same sender and recipient
-- Created: 2026-04-27
-- Status: NOT YET APPLIED - must be run against Neon database

-- Add from_user_id column to store the sender's user_id for friend request notifications
ALTER TABLE notifications ADD COLUMN from_user_id integer;

-- Add foreign key constraint (optional but recommended for referential integrity)
ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_from_user 
FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Create unique partial index to prevent duplicate friend requests
-- This index ensures only one active (pending or accepted) friend request exists between a sender and recipient
-- Declined requests are excluded from the index, allowing new requests after decline
CREATE UNIQUE INDEX idx_notifications_friend_request_unique
ON notifications (user_id, from_user_id, type)
WHERE type = 'friend_request' AND (data->>'status') IS DISTINCT FROM 'declined';

-- Create index on from_user_id for query performance
CREATE INDEX idx_notifications_from_user_id ON notifications (from_user_id);

-- Optional: Backfill from_user_id for existing friend_request notifications
-- Uncomment and run if there are existing notifications you want to preserve
-- UPDATE notifications
-- SET from_user_id = (data->>'from_user_id')::integer
-- WHERE type = 'friend_request' AND data->>'from_user_id' IS NOT NULL;
