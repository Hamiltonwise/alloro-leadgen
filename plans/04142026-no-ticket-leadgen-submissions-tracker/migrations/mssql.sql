-- MSSQL equivalent of leadgen tracker tables.
-- Included for convention compliance; signalsai-backend is PostgreSQL-only.
-- TODO: fill during execution if MSSQL target is confirmed required

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'leadgen_sessions')
BEGIN
    CREATE TABLE leadgen_sessions (
        id                     UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        audit_id               NVARCHAR(64)     NULL,
        email                  NVARCHAR(MAX)    NULL,
        domain                 NVARCHAR(MAX)    NULL,
        practice_search_string NVARCHAR(MAX)    NULL,
        referrer               NVARCHAR(MAX)    NULL,
        utm_source             NVARCHAR(MAX)    NULL,
        utm_medium             NVARCHAR(MAX)    NULL,
        utm_campaign           NVARCHAR(MAX)    NULL,
        utm_term               NVARCHAR(MAX)    NULL,
        utm_content            NVARCHAR(MAX)    NULL,
        final_stage            NVARCHAR(48)     NOT NULL DEFAULT 'landed',
        completed              BIT              NOT NULL DEFAULT 0,
        abandoned              BIT              NOT NULL DEFAULT 0,
        first_seen_at          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        last_seen_at           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at             DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at             DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'leadgen_events')
BEGIN
    CREATE TABLE leadgen_events (
        id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        session_id UNIQUEIDENTIFIER NOT NULL,
        event_name NVARCHAR(48)     NOT NULL,
        event_data NVARCHAR(MAX)    NULL,
        created_at DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_leadgen_events_session
            FOREIGN KEY (session_id) REFERENCES leadgen_sessions(id) ON DELETE CASCADE
    );
END;
