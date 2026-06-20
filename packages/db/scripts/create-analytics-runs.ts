import { db, queryClient } from '../src/client.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating analytics_runs table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMP NOT NULL,
      finished_at TIMESTAMP,
      duration_ms INTEGER,
      wallets_processed INTEGER,
      tokens_processed INTEGER,
      signals_generated INTEGER,
      recommendations_generated INTEGER,
      status TEXT NOT NULL,
      error TEXT
    );
  `);
  console.log('analytics_runs table created successfully.');
  await queryClient.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
