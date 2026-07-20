-- [Claude.DB] Migration 001: Core Schema
-- Creates base tables: users, sessions, projects, layers
-- Depends on: none
-- Reversible: see DOWN section at bottom

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- [Claude.DB] Users & Authentication
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- =========================================================
-- [Claude.DB] Projects
-- =========================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  view_count INT NOT NULL DEFAULT 0,
  total_layers INT NOT NULL DEFAULT 0,
  total_size BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT ck_projects_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON projects (owner_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (created_at DESC) WHERE is_public = TRUE AND deleted_at IS NULL;

-- =========================================================
-- [Claude.DB] Layers & Canvas Data
-- =========================================================

DO $$ BEGIN
  CREATE TYPE layer_type AS ENUM (
    'group', 'shape', 'image', 'text', 'vector', 'video', 'model_3d', 'particle', 'component'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  layer_type layer_type NOT NULL,
  name VARCHAR NOT NULL,
  display_index INT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  opacity FLOAT NOT NULL DEFAULT 1.0,
  blend_mode VARCHAR NOT NULL DEFAULT 'normal',
  transform_matrix JSONB NOT NULL DEFAULT '{}',
  properties JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMP,
  CONSTRAINT ck_layers_opacity_range CHECK (opacity >= 0 AND opacity <= 1),
  CONSTRAINT ck_layers_not_self_parent CHECK (parent_layer_id IS DISTINCT FROM id)
);

CREATE INDEX IF NOT EXISTS idx_layers_project_id ON layers (project_id);
CREATE INDEX IF NOT EXISTS idx_layers_parent_id ON layers (parent_layer_id);
CREATE INDEX IF NOT EXISTS idx_layers_display_order ON layers (project_id, parent_layer_id, display_index);
CREATE INDEX IF NOT EXISTS idx_layers_not_deleted ON layers (project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_layers_properties_gin ON layers USING GIN (properties);

-- =========================================================
-- [Claude.DB] updated_at trigger helper (used by later migrations too)
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_layers_updated_at ON layers;
CREATE TRIGGER trg_layers_updated_at BEFORE UPDATE ON layers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- =========================================================
-- DOWN (manual rollback reference; not auto-executed)
-- =========================================================
-- DROP TRIGGER IF EXISTS trg_layers_updated_at ON layers;
-- DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
-- DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP TABLE IF EXISTS layers;
-- DROP TYPE IF EXISTS layer_type;
-- DROP TABLE IF EXISTS projects;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS users;
