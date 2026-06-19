CREATE TABLE IF NOT EXISTS "execution_orders" (
  "id"                varchar(36) PRIMARY KEY,
  "agent_id"          varchar(50) NOT NULL,
  "agent_wallet"      varchar(42) NOT NULL,
  "decision_trace_id" varchar(36),
  "recommendation_id" varchar(36) NOT NULL,
  "token_address"     varchar(42) NOT NULL,
  "token_symbol"      varchar(50) NOT NULL,
  "action"            varchar(8) NOT NULL,
  "amount_usd"        double precision NOT NULL,
  "slippage_limit_pct" double precision NOT NULL,
  "position_size_pct" double precision NOT NULL,
  "entry_price_usd"   double precision NOT NULL,
  "stop_loss_pct"     double precision NOT NULL,
  "take_profit_pct"   double precision NOT NULL,
  "status"            varchar(12) NOT NULL DEFAULT 'PENDING',
  "failure_reason"    varchar(255),
  "created_at"        timestamp DEFAULT now() NOT NULL,
  "updated_at"        timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "exec_orders_recommendation_id_idx"
  ON "execution_orders" ("recommendation_id");

CREATE INDEX IF NOT EXISTS "exec_orders_agent_id_idx"
  ON "execution_orders" ("agent_id");

CREATE INDEX IF NOT EXISTS "exec_orders_wallet_idx"
  ON "execution_orders" ("agent_wallet");

CREATE INDEX IF NOT EXISTS "exec_orders_status_idx"
  ON "execution_orders" ("status");
