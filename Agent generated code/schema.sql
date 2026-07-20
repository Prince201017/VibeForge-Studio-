-- [Claude.A14] Persistence schema for the Advanced AI Engine's own state.
--
-- Scope note: this covers ONLY what this subsystem owns (refinement
-- sessions, analytics). It is not a replacement for the platform-wide
-- schema in 11_DATABASE_SCHEMA_NEEDS.md, which this agent was not given
-- and which likely already defines a `projects`/`designs` table this
-- engine's designId should foreign-key into. Where that's true, replace
-- the bare TEXT design_id columns below with a proper FK once that
-- schema is available.

CREATE TABLE IF NOT EXISTS ai_refinement_sessions (
    design_id       TEXT PRIMARY KEY,
    current_design  JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_refinement_history (
    id              BIGSERIAL PRIMARY KEY,
    design_id       TEXT NOT NULL REFERENCES ai_refinement_sessions(design_id) ON DELETE CASCADE,
    feedback        TEXT NOT NULL,
    applied_changes JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refinement_history_design_id
    ON ai_refinement_history (design_id, created_at);

CREATE TABLE IF NOT EXISTS ai_feature_usage (
    feature         TEXT PRIMARY KEY,
    call_count      BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_ratings (
    id              BIGSERIAL PRIMARY KEY,
    request_id      TEXT NOT NULL,
    feature         TEXT NOT NULL,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ratings_feature ON ai_ratings (feature, created_at);

CREATE TABLE IF NOT EXISTS ai_failures (
    id              BIGSERIAL PRIMARY KEY,
    feature         TEXT NOT NULL,
    reason          TEXT NOT NULL,
    provider        TEXT,
    model           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_failures_feature ON ai_failures (feature, created_at);
CREATE INDEX IF NOT EXISTS idx_failures_reason ON ai_failures (reason);

CREATE TABLE IF NOT EXISTS ai_model_performance (
    provider              TEXT NOT NULL,
    model                 TEXT NOT NULL,
    calls                 BIGINT NOT NULL DEFAULT 0,
    successes             BIGINT NOT NULL DEFAULT 0,
    failures              BIGINT NOT NULL DEFAULT 0,
    total_latency_ms      BIGINT NOT NULL DEFAULT 0,
    total_cost_usd        NUMERIC(12, 6) NOT NULL DEFAULT 0,
    total_prompt_tokens   BIGINT NOT NULL DEFAULT 0,
    total_completion_tokens BIGINT NOT NULL DEFAULT 0,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, model)
);
