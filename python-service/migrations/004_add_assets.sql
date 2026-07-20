-- [Claude.DB] Migration 004: Assets & Notifications
-- Adds assets, notifications, audit_logs
-- Depends on: 001_init_schema.sql, 002_add_collaboration.sql, 003_add_animations.sql

BEGIN;

-- =========================================================
-- [Claude.DB] Assets
-- =========================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  asset_type VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  metadata JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  file_size BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  usage_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assets_project ON assets (project_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (project_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_tags_gin ON assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_assets_updated_at ON assets;
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Needed for trigram search index above
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================
-- [Claude.DB] Notifications
-- =========================================================

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('comment', 'mention', 'share', 'permission', 'join', 'export');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  related_user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;

-- =========================================================
-- [Claude.DB] Audit Logging
-- =========================================================

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'share', 'permission_change');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR NOT NULL,
  resource_id UUID NOT NULL,
  action audit_action NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, created_at DESC);

COMMIT;

-- =========================================================
-- DOWN
-- =========================================================
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TYPE IF EXISTS audit_action;
-- DROP TABLE IF EXISTS notifications;
-- DROP TYPE IF EXISTS notification_type;
-- DROP TABLE IF EXISTS assets;
