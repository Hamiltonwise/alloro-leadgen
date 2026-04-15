-- Leadgen tracking overhaul — PostgreSQL migration
-- Adds: conversion tracking, user linking, parsed UA columns.
-- Target table: leadgen_sessions
-- Rollback: drop the added columns in reverse order.

-- TODO: fill during execution — final column order + nullability decisions
ALTER TABLE leadgen_sessions
  ADD COLUMN IF NOT EXISTS converted_at  TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS user_id       INTEGER     NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS browser       TEXT        NULL,
  ADD COLUMN IF NOT EXISTS os            TEXT        NULL,
  ADD COLUMN IF NOT EXISTS device_type   TEXT        NULL;

CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_user_id     ON leadgen_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_converted   ON leadgen_sessions (converted_at) WHERE converted_at IS NOT NULL;

-- Supporting index for the cumulative-funnel rewrite in T1:
-- max event ordinal per session requires scanning events per session
CREATE INDEX IF NOT EXISTS idx_leadgen_events_session_event ON leadgen_events (session_id, event_name);

-- TODO: fill during execution — seed/backfill pass for existing rows:
--   UPDATE leadgen_sessions SET browser = ..., os = ..., device_type = ...
--   WHERE user_agent IS NOT NULL AND browser IS NULL;
