-- Adds retry_count to audit_processes (MSSQL variant).
-- Named default constraint so rollback can drop it cleanly.

-- TODO: fill during execution
ALTER TABLE audit_processes
  ADD retry_count INT NOT NULL
    CONSTRAINT DF_audit_processes_retry_count DEFAULT 0;

-- Rollback
-- ALTER TABLE audit_processes DROP CONSTRAINT DF_audit_processes_retry_count;
-- ALTER TABLE audit_processes DROP COLUMN retry_count;
