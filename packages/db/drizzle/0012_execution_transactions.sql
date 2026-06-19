CREATE TABLE IF NOT EXISTS "execution_transactions" (
  "id"            varchar(36) PRIMARY KEY,
  "agent_id"      varchar(50) NOT NULL,
  "agent_wallet"  varchar(42) NOT NULL,
  "order_id"      varchar(36) NOT NULL,
  "tx_hash"       varchar(100) NOT NULL,
  "chain"         varchar(20) NOT NULL,
  "status"        varchar(12) NOT NULL,
  "error_message" varchar(500),
  "executed_at"   timestamp NOT NULL,
  "created_at"    timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "exec_txns_order_id_idx"
  ON "execution_transactions" ("order_id");

CREATE INDEX IF NOT EXISTS "exec_txns_agent_id_idx"
  ON "execution_transactions" ("agent_id");

CREATE INDEX IF NOT EXISTS "exec_txns_wallet_idx"
  ON "execution_transactions" ("agent_wallet");
