-- Migration: Add AR zones, AprilTag metadata, and AR echoes tables
-- Run against Neon Postgres

-- Zones represent campus areas where AR is enabled
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campus_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each zone can have one or more AprilTags
CREATE TABLE IF NOT EXISTS zone_apriltags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL UNIQUE,
  tag_size_meters NUMERIC NOT NULL DEFAULT 0.1524,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zone_apriltags_zone_id ON zone_apriltags(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_apriltags_tag_id ON zone_apriltags(tag_id);

-- AR echoes placed relative to an AprilTag anchor
-- Coordinates are LOCAL to the tag anchor, not world-space
CREATE TABLE IF NOT EXISTS ar_echoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  apriltag_id INTEGER NOT NULL,
  author_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  local_x NUMERIC NOT NULL DEFAULT 0,
  local_y NUMERIC NOT NULL DEFAULT 0,
  local_z NUMERIC NOT NULL DEFAULT 0,
  rotation_y NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_echoes_zone_id ON ar_echoes(zone_id);
CREATE INDEX IF NOT EXISTS idx_ar_echoes_apriltag_id ON ar_echoes(apriltag_id);
CREATE INDEX IF NOT EXISTS idx_ar_echoes_author ON ar_echoes(author_user_id);
CREATE INDEX IF NOT EXISTS idx_ar_echoes_status ON ar_echoes(status);

-- Seed a default zone for development/testing
INSERT INTO zones (name, campus_area)
VALUES ('Library Courtyard', 'Central Campus')
ON CONFLICT DO NOTHING;
