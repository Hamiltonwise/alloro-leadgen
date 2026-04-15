-- Email-notify FAB queue — MSSQL scaffold (prod is Postgres; present for parity)
-- TODO: fill / validate if MSSQL is ever a real target.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'leadgen_email_notifications')
BEGIN
  CREATE TABLE leadgen_email_notifications (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    session_id      UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES leadgen_sessions(id) ON DELETE CASCADE,
    audit_id        UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES audit_processes(id),
    email           NVARCHAR(MAX) NOT NULL,
    status          NVARCHAR(16) NOT NULL DEFAULT 'pending',
    attempt_count   INT NOT NULL DEFAULT 0,
    last_error      NVARCHAR(MAX) NULL,
    created_at      DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    sent_at         DATETIMEOFFSET NULL,
    CONSTRAINT uniq_leadgen_email_notif_session_audit UNIQUE (session_id, audit_id)
  );

  CREATE INDEX idx_leadgen_email_notif_audit_status
    ON leadgen_email_notifications (audit_id, status);

  CREATE INDEX idx_leadgen_email_notif_status_created
    ON leadgen_email_notifications (status, created_at DESC);
END;
