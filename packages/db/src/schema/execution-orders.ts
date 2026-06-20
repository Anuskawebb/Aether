import {
  pgTable,
  varchar,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * execution_orders — actionable trade intent derived from ExecutionPlans.
 *
 * Recommendations are intelligence (why to trade).
 * Orders are intent (what to actually execute, at what price, via which route).
 *
 * One order per recommendation: unique(recommendation_id).
 * If an order FAILs, the recommendation expires next cycle and a fresh
 * recommendation (new UUID) generates a new order — no retry of stale intent.
 *
 * Lifecycle: PENDING → PROCESSING → FILLED | FAILED | CANCELLED
 *
 * agent_id is stable across wallet rotations.
 * agent_wallet is the active wallet at order creation time.
 * decision_trace_id links to future explainability infrastructure (nullable).
 */
export const executionOrders = pgTable('execution_orders', {
  id:               varchar('id', { length: 36 }).primaryKey(),

  agentId:          varchar('agent_id', { length: 50 }).notNull(),
  agentWallet:      varchar('agent_wallet', { length: 42 }).notNull(),
  decisionTraceId:  varchar('decision_trace_id', { length: 36 }),

  recommendationId: varchar('recommendation_id', { length: 36 }).notNull(),

  tokenAddress:     varchar('token_address', { length: 42 }).notNull(),
  tokenSymbol:      varchar('token_symbol', { length: 50 }).notNull(),

  action:           varchar('action', { length: 8 }).notNull(),  // 'BUY' | 'SELL'

  // Swap-level amounts (from ExecutionPlan)
  amountUsd:        doublePrecision('amount_usd').notNull(),
  slippageLimitPct: doublePrecision('slippage_limit_pct').notNull(),

  // Risk parameters (from Recommendation, for position lifecycle)
  positionSizePct:  doublePrecision('position_size_pct').notNull(),
  entryPriceUsd:    doublePrecision('entry_price_usd').notNull(),
  stopLossPct:      doublePrecision('stop_loss_pct').notNull(),
  takeProfitPct:    doublePrecision('take_profit_pct').notNull(),

  // Lifecycle
  status:           varchar('status', { length: 12 }).notNull().default('PENDING'),
  failureReason:    varchar('failure_reason', { length: 255 }),

  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agentIdIdx:          index('exec_orders_agent_id_idx').on(table.agentId),
  agentWalletIdx:      index('exec_orders_wallet_idx').on(table.agentWallet),
  statusIdx:           index('exec_orders_status_idx').on(table.status),
  recommendationIdIdx: uniqueIndex('exec_orders_recommendation_id_idx').on(table.recommendationId),
}));

export type ExecutionOrderRow    = typeof executionOrders.$inferSelect;
export type InsertExecutionOrder = typeof executionOrders.$inferInsert;
