CREATE TABLE IF NOT EXISTS user_mutes (
  id SERIAL PRIMARY KEY,
  muter_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  muted_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (muter_user_id, muted_user_id),
  CHECK (muter_user_id <> muted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_muter_user_id ON user_mutes (muter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted_user_id ON user_mutes (muted_user_id);
