-- Leadgen tracker tables.
-- TODO: fill during execution — confirm audit_processes.id type matches (VARCHAR(64))

CREATE TABLE IF NOT EXISTS leadgen_sessions (
    id                     UUID         PRIMARY KEY,
    audit_id               VARCHAR(64),
    email                  TEXT,
    domain                 TEXT,
    practice_search_string TEXT,
    referrer               TEXT,
    utm_source             TEXT,
    utm_medium             TEXT,
    utm_campaign           TEXT,
    utm_term               TEXT,
    utm_content            TEXT,
    final_stage            VARCHAR(48)  NOT NULL DEFAULT 'landed',
    completed              BOOLEAN      NOT NULL DEFAULT FALSE,
    abandoned              BOOLEAN      NOT NULL DEFAULT FALSE,
    first_seen_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_leadgen_sessions_audit
        FOREIGN KEY (audit_id) REFERENCES audit_processes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_audit_id     ON leadgen_sessions (audit_id);
CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_email        ON leadgen_sessions (email);
CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_created_at   ON leadgen_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_final_stage  ON leadgen_sessions (final_stage);

CREATE TABLE IF NOT EXISTS leadgen_events (
    id          UUID         PRIMARY KEY,
    session_id  UUID         NOT NULL REFERENCES leadgen_sessions(id) ON DELETE CASCADE,
    event_name  VARCHAR(48)  NOT NULL,
    event_data  JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadgen_events_session_id          ON leadgen_events (session_id);
CREATE INDEX IF NOT EXISTS idx_leadgen_events_session_id_created  ON leadgen_events (session_id, created_at);
