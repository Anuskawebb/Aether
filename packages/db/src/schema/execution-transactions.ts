import {
  pgTable,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * execution_transactions — outcome record for each execution attempt.
 *
 * One transaction per order (unique on order_id).
 * Phase 8A: chain = 'mock', tx_hash = 'mock_tx_<orderId>'
 * Phase 8B: chain = 'bsc', tx_hash = real on-chain hash
 */
export const executionTransactions = pgTable('execution_transactions', {
  id:           varchar('id', { length: 36 }).primaryKey(),

  agentId:      varchar('agent_id', { length: 50 }).notNull(),
  agentWallet:  varchar('agent_wallet', { length: 42 }).notNull(),

  orderId:      varchar('order_id', { length: 36 }).notNull(),  // FK → execution_orders.id

  txHash:       varchar('tx_hash', { length: 100 }).notNull(),
  chain:        varchar('chain', { length: 20 }).notNull(),     // 'mock' | 'bsc'
  status:       varchar('status', { length: 12 }).notNull(),    // 'SUCCESS' | 'FAILED'
  errorMessage: varchar('error_message', { length: 500 }),

  executedAt:   timestamp('executed_at').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  agentIdIdx:    index('exec_txns_agent_id_idx').on(table.agentId),
  agentWalletIdx: index('exec_txns_wallet_idx').on(table.agentWallet),
  orderIdIdx:    uniqueIndex('exec_txns_order_id_idx').on(table.orderId),
}));

export type ExecutionTransactionRow    = typeof executionTransactions.$inferSelect;
export type InsertExecutionTransaction = typeof executionTransactions.$inferInsert;
