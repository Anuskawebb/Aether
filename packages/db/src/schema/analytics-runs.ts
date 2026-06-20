import { pgTable, serial, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const analyticsRuns = pgTable('analytics_runs', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),

  walletsProcessed: integer('wallets_processed'),
  tokensProcessed: integer('tokens_processed'),
  signalsGenerated: integer('signals_generated'),
  recommendationsGenerated: integer('recommendations_generated'),

  status: text('status').notNull(), // 'running', 'completed', 'failed'
  error: text('error'),
});

export type AnalyticsRun = typeof analyticsRuns.$inferSelect;
export type NewAnalyticsRun = typeof analyticsRuns.$inferInsert;
