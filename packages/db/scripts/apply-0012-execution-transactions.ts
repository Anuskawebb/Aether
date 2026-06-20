import { db, queryClient, sql } from '../src/client.js';

async function main() {
  await db.execute(sql.raw(`
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
    )
  `));

  await db.execute(sql.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS "exec_txns_order_id_idx"
      ON "execution_transactions" ("order_id")
  `));

  await db.execute(sql.raw(`
    CREATE INDEX IF NOT EXISTS "exec_txns_agent_id_idx"
      ON "execution_transactions" ("agent_id")
  `));

  await db.execute(sql.raw(`
    CREATE INDEX IF NOT EXISTS "exec_txns_wallet_idx"
      ON "execution_transactions" ("agent_wallet")
  `));

  console.log('Migration 0012: execution_transactions table and indexes applied.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => queryClient.end());
