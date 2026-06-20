-- 0016_multi_tenant_backfill.sql
-- Seeds the default user and agent, then backfills execution_accounts.user_id.
--
-- Default user:  id = '00000000-0000-0000-0000-000000000001'  (system operator)
-- Default agent: id = 'toro-agent-001'  (matches existing execution_accounts rows)
--
-- Agent config (name / riskLevel / tradingMode) is lifted from the current
-- execution_accounts.metadata JSONB on the default agent row. If the column
-- has not been written yet, the defaults (BALANCED / AUTONOMOUS) are used.
-- The metadata column is NOT removed — it stays for backward compatibility.

DO $$
DECLARE
  v_user_id    TEXT := '00000000-0000-0000-0000-000000000001';
  v_agent_id   TEXT := 'toro-agent-001';
  v_agent_name TEXT;
  v_risk       TEXT;
  v_mode       TEXT;
  v_meta       JSONB;
BEGIN

  -- ── 1. Default User ────────────────────────────────────────────────────────
  INSERT INTO users (id, display_name, created_at, updated_at)
  VALUES (v_user_id, 'Default Operator', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Read metadata from existing execution_accounts row (if any) ─────────
  SELECT metadata
  INTO   v_meta
  FROM   execution_accounts
  WHERE  agent_id = v_agent_id
  LIMIT  1;

  -- Normalise: metadata may be stored as a JSONB string rather than object
  -- (legacy issue). Extract the inner text and re-parse if needed.
  IF v_meta IS NOT NULL AND jsonb_typeof(v_meta) = 'string' THEN
    v_meta := (v_meta #>> '{}')::jsonb;
  END IF;

  v_agent_name := COALESCE(v_meta->>'agentName',   'Toro Alpha');
  v_risk       := UPPER(COALESCE(v_meta->>'riskLevel',   'balanced'));
  v_mode       := UPPER(COALESCE(v_meta->>'tradingMode', 'autonomous'));

  -- ── 3. Default Agent ───────────────────────────────────────────────────────
  INSERT INTO agents (id, user_id, name, risk_level, trading_mode, status, created_at, updated_at)
  VALUES (v_agent_id, v_user_id, v_agent_name, v_risk, v_mode, 'ACTIVE', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Backfill execution_accounts.user_id ────────────────────────────────
  UPDATE execution_accounts
  SET    user_id    = v_user_id,
         updated_at = NOW()
  WHERE  agent_id   = v_agent_id
    AND  (user_id IS NULL OR user_id = '');

END $$;
