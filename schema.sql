-- ============================================================
--  ReportASA — PostgreSQL Schema
--  Run once:  psql $DATABASE_URL -f schema.sql
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ── Reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT        PRIMARY KEY DEFAULT 'report-' || gen_random_uuid(),
  status      TEXT        NOT NULL DEFAULT 'Under Review',
  type        TEXT        NOT NULL DEFAULT '',
  date        DATE,
  location    TEXT        NOT NULL DEFAULT '',
  org         TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  contact     TEXT        NOT NULL DEFAULT '',
  anonymous   BOOLEAN     NOT NULL DEFAULT TRUE,
  links       JSONB       NOT NULL DEFAULT '[]',
  source      TEXT        NOT NULL DEFAULT 'full_form',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_status_idx    ON reports (status);
CREATE INDEX IF NOT EXISTS reports_created_idx   ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_location_idx  ON reports (location);

-- ── Feed ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed (
  id         TEXT        PRIMARY KEY,
  location   TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT '',
  time       TEXT        NOT NULL DEFAULT 'just now',
  status     TEXT        NOT NULL DEFAULT 'Under Review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default feed rows (skip if already exist)
INSERT INTO feed (id, location, type, time, status) VALUES
  ('feed-1', 'New York, NY',    'Online Harassment', '2 hours ago', 'Under Review'),
  ('feed-2', 'Los Angeles, CA', 'Workplace',         '5 hours ago', 'Resolved'),
  ('feed-3', 'Chicago, IL',     'Educational',       '1 day ago',   'In Progress'),
  ('feed-4', 'Houston, TX',     'Community',         '2 days ago',  'Resolved')
ON CONFLICT (id) DO NOTHING;

-- ── Stats overrides ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats_overrides (
  key   TEXT    PRIMARY KEY,
  value NUMERIC NOT NULL DEFAULT 0
);

INSERT INTO stats_overrides (key, value) VALUES ('community_members', 0)
ON CONFLICT (key) DO NOTHING;

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT        PRIMARY KEY DEFAULT 'user-' || gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL DEFAULT '',
  name          TEXT        NOT NULL DEFAULT '',
  title         TEXT        NOT NULL DEFAULT '',
  department    TEXT        NOT NULL DEFAULT '',
  bio           TEXT        NOT NULL DEFAULT '',
  avatar        TEXT        NOT NULL DEFAULT '',
  role          TEXT        NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

-- ── Contact submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         TEXT        PRIMARY KEY DEFAULT 'contact-' || gen_random_uuid(),
  name       TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  subject    TEXT        NOT NULL DEFAULT '',
  message    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_created_idx ON contact_submissions (created_at DESC);

-- ── Helper: auto-update updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
