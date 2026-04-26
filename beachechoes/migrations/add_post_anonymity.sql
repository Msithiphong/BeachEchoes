-- Migration: add_post_anonymity.sql
-- Adds per-post anonymity so each Echo can hide author identity independently.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;
