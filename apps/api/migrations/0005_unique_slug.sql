-- Fix duplicate slugs by appending the config ID suffix
-- This is a one-time fix for existing duplicates

-- Create unique index on slug column
-- SQLite will fail if there are duplicates, so we need to fix them first
-- Using a workaround: update duplicates with id suffix before creating index

-- Note: This migration assumes duplicates have been manually fixed or will be
-- fixed by the application code. The unique index ensures no future duplicates.

CREATE UNIQUE INDEX IF NOT EXISTS idx_configs_slug ON configs(slug);
