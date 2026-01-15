-- Migration: 0006_add_indexes
-- Add missing database indexes for query performance

-- Index for myConfigs query (SELECT WHERE author_id = ?)
CREATE INDEX IF NOT EXISTS idx_configs_author_id ON configs(author_id);

-- Compound indexes for common sorted queries on published configs
-- These help with queries like: WHERE status = 'published' ORDER BY score DESC
CREATE INDEX IF NOT EXISTS idx_configs_status_score ON configs(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_configs_status_likes ON configs(status, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_configs_status_created ON configs(status, created_at DESC);

-- Compound index for getting published comments for a config
-- Helps with queries like: WHERE config_id = ? AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_comments_config_status ON comments(config_id, status);
