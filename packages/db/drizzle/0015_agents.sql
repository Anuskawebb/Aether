-- 0015_agents.sql
-- Creates the agents ownership table.
-- id is varchar(50) so the existing 'toro-agent-001' value maps directly.

CREATE TABLE IF NOT EXISTS "agents" (
  "id"           varchar(50)  PRIMARY KEY,
  "user_id"      varchar(36)  NOT NULL,
  "name"         varchar(100) NOT NULL,
  "risk_level"   varchar(20)  NOT NULL DEFAULT 'BALANCED',
  "trading_mode" varchar(20)  NOT NULL DEFAULT 'AUTONOMOUS',
  "status"       varchar(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"   timestamp    DEFAULT now() NOT NULL,
  "updated_at"   timestamp    DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agents_user_id_idx" ON "agents" ("user_id");
CREATE INDEX IF NOT EXISTS "agents_status_idx"  ON "agents" ("status");
