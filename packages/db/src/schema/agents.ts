import { pgTable, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * agents — one agent per user (V1) → many agents per user (V2).
 *
 * id is varchar(50) rather than strict UUID so the pre-existing
 * execution_accounts rows with agent_id = 'toro-agent-001' continue
 * to resolve without touching any existing data.
 *
 * riskLevel / tradingMode mirror the values stored in
 * execution_accounts.metadata and are the authoritative source
 * going forward. The metadata copy is kept for backward compat.
 */
export const agents = pgTable('agents', {
  id:          varchar('id', { length: 50 }).primaryKey(), // 'toro-agent-001' for default

  userId:      varchar('user_id', { length: 36 }).notNull(),

  name:        varchar('name', { length: 100 }).notNull(),

  riskLevel:   varchar('risk_level', { length: 20 }).notNull().default('BALANCED'),
  // CONSERVATIVE | BALANCED | AGGRESSIVE

  tradingMode: varchar('trading_mode', { length: 20 }).notNull().default('AUTONOMOUS'),
  // AUTONOMOUS | ASSISTED

  status:      varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  // ACTIVE | PAUSED | ARCHIVED

  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('agents_user_id_idx').on(table.userId),
  statusIdx: index('agents_status_idx').on(table.status),
}));

export type AgentRow    = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

export type RiskLevel   = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type TradingMode = 'AUTONOMOUS' | 'ASSISTED';
export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
