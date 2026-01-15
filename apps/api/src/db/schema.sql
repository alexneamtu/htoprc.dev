-- htoprc.dev Database Schema

-- Users (from OAuth providers)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_url TEXT,
  is_trusted INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- User auth providers (supports account linking)
CREATE TABLE IF NOT EXISTS user_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

-- Configs (scraped or uploaded)
CREATE TABLE IF NOT EXISTS configs (
  id TEXT PRIMARY KEY,
  slug TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  source_platform TEXT,
  author_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'published',
  flag_reason TEXT,
  rejection_reason TEXT,
  score INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  htop_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_id TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, config_id)
);

-- Scraper state
CREATE TABLE IF NOT EXISTS scraper_runs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  configs_found INTEGER DEFAULT 0,
  configs_added INTEGER DEFAULT 0,
  last_cursor TEXT,
  error_message TEXT
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_date TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, action_type, action_date)
);

CREATE TABLE IF NOT EXISTS anon_rate_limits (
  anon_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_date TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (anon_key, action_type, action_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_configs_status ON configs(status);
CREATE INDEX IF NOT EXISTS idx_configs_created_at ON configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_configs_score ON configs(score DESC);
CREATE INDEX IF NOT EXISTS idx_configs_slug ON configs(slug);
CREATE INDEX IF NOT EXISTS idx_comments_config_id ON comments(config_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_providers(user_id);
