CREATE TABLE IF NOT EXISTS anon_rate_limits (
  anon_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_date TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (anon_key, action_type, action_date)
);
