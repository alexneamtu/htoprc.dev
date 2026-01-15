-- Add forked_from_id column to configs table
ALTER TABLE configs ADD COLUMN forked_from_id TEXT REFERENCES configs(id);

-- Create reports table for content reporting
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  content_type    TEXT NOT NULL,      -- 'config' | 'comment'
  content_id      TEXT NOT NULL,
  reporter_id     TEXT NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'reviewed' | 'dismissed'
  reviewed_at     TEXT,
  reviewed_by     TEXT REFERENCES users(id),
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Index for finding pending reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(content_type, content_id);
