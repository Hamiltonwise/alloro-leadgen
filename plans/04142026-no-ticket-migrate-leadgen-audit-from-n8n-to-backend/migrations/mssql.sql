-- MSSQL equivalent of audit_processes ensure migration.
-- Included for convention compliance; signalsai-backend is PostgreSQL-only.
-- TODO: fill during execution if MSSQL target is confirmed required

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_processes')
BEGIN
    CREATE TABLE audit_processes (
        id                     NVARCHAR(64)  NOT NULL PRIMARY KEY,
        domain                 NVARCHAR(MAX) NOT NULL,
        practice_search_string NVARCHAR(MAX) NOT NULL,
        status                 NVARCHAR(32)  NOT NULL DEFAULT 'pending',
        realtime_status        INT           NOT NULL DEFAULT 0,
        error_message          NVARCHAR(MAX) NULL,
        step_screenshots       NVARCHAR(MAX) NULL,
        step_website_analysis  NVARCHAR(MAX) NULL,
        step_self_gbp          NVARCHAR(MAX) NULL,
        step_competitors       NVARCHAR(MAX) NULL,
        step_gbp_analysis      NVARCHAR(MAX) NULL,
        created_at             DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at             DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
