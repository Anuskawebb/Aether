-- Add user profile fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS experience           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS goals                VARCHAR(50),
  ADD COLUMN IF NOT EXISTS risk_tolerance       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trading_preference   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS capital_range        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark the system seed user as already onboarded so it doesn't get redirected
UPDATE users
SET onboarding_completed = TRUE
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Extend agent status enum vocabulary (no constraint change needed — column is VARCHAR)
-- Valid values: DRAFT | PENDING_FUNDING | ACTIVE | PAUSED | ARCHIVED
-- Existing records stay ACTIVE; new agents created via the UI start as DRAFT
