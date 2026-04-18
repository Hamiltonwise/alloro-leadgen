-- Adds retry_count to audit_processes.
-- Public retry endpoint caps user-initiated retries at 3 per audit;
-- admin rerun bypasses the cap and does not increment this counter.
-- Default 0 so existing rows back-fill safely.

-- TODO: fill during execution
ALTER TABLE audit_processes
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

-- Rollback
-- ALTER TABLE audit_processes DROP COLUMN retry_count;
