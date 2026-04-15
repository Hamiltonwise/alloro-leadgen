-- Ensures audit_processes table exists with strict schema.
-- Idempotent: safe to run on a DB where n8n already created the table.
-- TODO: fill during execution — confirm column types match current prod

CREATE TABLE IF NOT EXISTS audit_processes (
    id                     VARCHAR(64) PRIMARY KEY,
    domain                 TEXT        NOT NULL,
    practice_search_string TEXT        NOT NULL,
    status                 VARCHAR(32) NOT NULL DEFAULT 'pending',
    realtime_status        INTEGER     NOT NULL DEFAULT 0,
    error_message          TEXT,
    step_screenshots       JSONB,
    step_website_analysis  JSONB,
    step_self_gbp          JSONB,
    step_competitors       JSONB,
    step_gbp_analysis      JSONB,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TODO: fill during execution — add indexes if query patterns demand
CREATE INDEX IF NOT EXISTS idx_audit_processes_status
    ON audit_processes (status);

CREATE INDEX IF NOT EXISTS idx_audit_processes_created_at
    ON audit_processes (created_at DESC);
