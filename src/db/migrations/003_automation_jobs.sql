-- Migration: Create automation_jobs table
-- Run this against your Neon database

CREATE TYPE job_status AS ENUM ('pending', 'running', 'success', 'failed');

CREATE TABLE automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the job processor query
CREATE INDEX idx_automation_jobs_pending ON automation_jobs (status, created_at)
  WHERE status = 'pending';

-- RLS
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- Admin full access within their school
CREATE POLICY automation_jobs_admin_all ON automation_jobs FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);

-- System/cron can read all (no RLS session set — uses superuser/service role)
-- The job processor runs without RLS context, so it bypasses RLS naturally
-- when using a superuser connection. If using a restricted role, grant:
-- GRANT ALL ON automation_jobs TO service_role;
