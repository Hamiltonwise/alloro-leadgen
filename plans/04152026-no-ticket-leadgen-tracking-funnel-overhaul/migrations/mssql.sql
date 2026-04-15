-- Leadgen tracking overhaul — MSSQL migration (scaffolded; prod is Postgres)
-- Present for CLAUDE.md convention parity. Execute only if MSSQL target exists.

-- TODO: fill during execution — confirm MSSQL target exists for this system
IF COL_LENGTH('leadgen_sessions', 'converted_at') IS NULL
  ALTER TABLE leadgen_sessions ADD converted_at DATETIMEOFFSET NULL;

IF COL_LENGTH('leadgen_sessions', 'user_id') IS NULL
  ALTER TABLE leadgen_sessions ADD user_id INT NULL
    FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL;

IF COL_LENGTH('leadgen_sessions', 'browser') IS NULL
  ALTER TABLE leadgen_sessions ADD browser NVARCHAR(64) NULL;

IF COL_LENGTH('leadgen_sessions', 'os') IS NULL
  ALTER TABLE leadgen_sessions ADD os NVARCHAR(64) NULL;

IF COL_LENGTH('leadgen_sessions', 'device_type') IS NULL
  ALTER TABLE leadgen_sessions ADD device_type NVARCHAR(32) NULL;

-- TODO: fill during execution — CREATE INDEX statements if MSSQL is a target
