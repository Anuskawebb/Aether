-- Agent token watchlist: tokens the agent will trade
CREATE TABLE IF NOT EXISTS "agent_token_watchlist" (
  "id"         varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id"   varchar(36) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "address"    varchar(42) NOT NULL,
  "symbol"     varchar(50) NOT NULL,
  "name"       varchar(100) NOT NULL DEFAULT '',
  "added_at"   timestamp DEFAULT now() NOT NULL,
  UNIQUE (agent_id, address)
);

-- Agent trader watchlist: wallets the agent will copy-trade
CREATE TABLE IF NOT EXISTS "agent_trader_watchlist" (
  "id"          varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id"    varchar(36) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "wallet"      varchar(42) NOT NULL,
  "label"       varchar(100),
  "added_at"    timestamp DEFAULT now() NOT NULL,
  UNIQUE (agent_id, wallet)
);

CREATE INDEX IF NOT EXISTS agent_token_watchlist_agent_idx   ON agent_token_watchlist (agent_id);
CREATE INDEX IF NOT EXISTS agent_trader_watchlist_agent_idx  ON agent_trader_watchlist (agent_id);
