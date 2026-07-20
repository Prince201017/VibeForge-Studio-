-- [Claude.DB] Migration 003: Advanced Features
-- Adds animations, keyframes, geometry_operations, particle_systems, versions
-- Depends on: 001_init_schema.sql, 002_add_collaboration.sql

BEGIN;

-- =========================================================
-- [Claude.DB] Animations & Keyframes
-- =========================================================

CREATE TABLE IF NOT EXISTS animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  property_name VARCHAR NOT NULL,
  duration_ms INT NOT NULL,
  delay_ms INT NOT NULL DEFAULT 0,
  easing_type VARCHAR NOT NULL,
  loop_count INT NOT NULL DEFAULT 1,
  yoyo BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_animations_duration_positive CHECK (duration_ms > 0),
  CONSTRAINT ck_animations_delay_nonneg CHECK (delay_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_animations_layer ON animations (layer_id);
CREATE INDEX IF NOT EXISTS idx_animations_project ON animations (project_id);
CREATE INDEX IF NOT EXISTS idx_animations_active ON animations (layer_id) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_animations_updated_at ON animations;
CREATE TRIGGER trg_animations_updated_at BEFORE UPDATE ON animations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS keyframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
  time_ms INT NOT NULL,
  value JSONB NOT NULL,
  easing VARCHAR,
  interpolation VARCHAR NOT NULL DEFAULT 'linear',
  CONSTRAINT ck_keyframes_time_nonneg CHECK (time_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_keyframes_animation ON keyframes (animation_id, time_ms);

-- =========================================================
-- [Claude.DB] Geometry Operations (procedural modifier stack)
-- =========================================================

CREATE TABLE IF NOT EXISTS geometry_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_type VARCHAR NOT NULL,
  parameters JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_index INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geom_ops_layer ON geometry_operations (layer_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_geom_ops_project ON geometry_operations (project_id);

DROP TRIGGER IF EXISTS trg_geom_ops_updated_at ON geometry_operations;
CREATE TRIGGER trg_geom_ops_updated_at BEFORE UPDATE ON geometry_operations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- [Claude.DB] Particle Systems
-- =========================================================

CREATE TABLE IF NOT EXISTS particle_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  emitter_type VARCHAR NOT NULL,
  particle_count INT NOT NULL DEFAULT 1000,
  lifetime_ms INT NOT NULL DEFAULT 2000,
  physics_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_particle_count_positive CHECK (particle_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_particle_systems_layer ON particle_systems (layer_id);
CREATE INDEX IF NOT EXISTS idx_particle_systems_project ON particle_systems (project_id);

DROP TRIGGER IF EXISTS trg_particle_systems_updated_at ON particle_systems;
CREATE TRIGGER trg_particle_systems_updated_at BEFORE UPDATE ON particle_systems
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- [Claude.DB] Versions (named snapshots / autosaves)
-- =========================================================

CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR,
  description TEXT,
  snapshot JSONB NOT NULL,
  operation_count INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  is_auto_save BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON versions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_manual ON versions (project_id, created_at DESC) WHERE is_auto_save = FALSE;

COMMIT;

-- =========================================================
-- DOWN
-- =========================================================
-- DROP TABLE IF EXISTS versions;
-- DROP TABLE IF EXISTS particle_systems;
-- DROP TABLE IF EXISTS geometry_operations;
-- DROP TABLE IF EXISTS keyframes;
-- DROP TABLE IF EXISTS animations;
