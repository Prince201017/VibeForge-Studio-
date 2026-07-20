-- [Claude.DB] Migration 002: Collaboration
-- Adds project_collaborators, share_links, operations, comments, comment_mentions
-- Depends on: 001_init_schema.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE role_type AS ENUM ('owner', 'editor', 'viewer', 'commenter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- [Claude.DB] Collaborators & Permissions
-- =========================================================

CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role role_type NOT NULL,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMP,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_project_collaborators UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_project ON project_collaborators (project_id);
CREATE INDEX IF NOT EXISTS idx_collab_user ON project_collaborators (user_id);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  role role_type NOT NULL,
  token VARCHAR NOT NULL,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INT NOT NULL DEFAULT 0,
  CONSTRAINT uq_share_links_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_share_links_project ON share_links (project_id);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON share_links (token) WHERE is_active = TRUE;

-- =========================================================
-- [Claude.DB] Operations (append-only OT log for real-time sync)
-- =========================================================

CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_index BIGSERIAL NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  operation_type VARCHAR NOT NULL,
  operation_data JSONB NOT NULL,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  parent_operation_id UUID REFERENCES operations(id),
  lamport_time INT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_index ON operations (project_id, operation_index);
CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations (project_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_operations_user ON operations (project_id, user_id);

-- =========================================================
-- [Claude.DB] Comments & Annotations
-- =========================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_comments_text_not_blank CHECK (btrim(text) <> '')
);

CREATE INDEX IF NOT EXISTS idx_comments_project ON comments (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_layer ON comments (layer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_unresolved ON comments (project_id) WHERE resolved = FALSE;

CREATE TABLE IF NOT EXISTS comment_mentions (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions (mentioned_user_id);

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- =========================================================
-- DOWN
-- =========================================================
-- DROP TABLE IF EXISTS comment_mentions;
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS operations;
-- DROP TABLE IF EXISTS share_links;
-- DROP TABLE IF EXISTS project_collaborators;
-- DROP TYPE IF EXISTS role_type;
