-- Email-notify FAB queue — Postgres
-- Captures users who tap "Email me when ready" so the audit worker can
-- send their report on completion (or failure).

CREATE TABLE IF NOT EXISTS leadgen_email_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES leadgen_sessions(id) ON DELETE CASCADE,
  audit_id        UUID NOT NULL REFERENCES audit_processes(id)  ON DELETE CASCADE,
  email           TEXT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ NULL
);

-- Idempotency: one row per (session, audit). FAB submit upserts on this key.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_leadgen_email_notif_session_audit
  ON leadgen_email_notifications (session_id, audit_id);

-- Worker drain query: SELECT … WHERE audit_id=? AND status='pending'
CREATE INDEX IF NOT EXISTS idx_leadgen_email_notif_audit_status
  ON leadgen_email_notifications (audit_id, status);

-- Admin lookup: failures, recent activity
CREATE INDEX IF NOT EXISTS idx_leadgen_email_notif_status_created
  ON leadgen_email_notifications (status, created_at DESC);
