/**
 * apply-0014-multi-tenant-foundation.ts
 *
 * Applies migrations 0014, 0015, and 0016 in sequence:
 *   0014 — create users table
 *   0015 — create agents table
 *   0016 — seed default user + agent, backfill execution_accounts.user_id
 *
 * Safe to re-run: all DDL uses IF NOT EXISTS, seed uses ON CONFLICT DO NOTHING.
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../../../.env.local'), override: true });
dotenv.config({ path: resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../.env.local'), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes('supabase') || url.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
});

const migrations = [
  '0014_users.sql',
  '0015_agents.sql',
  '0016_multi_tenant_backfill.sql',
] as const;

async function run() {
  for (const file of migrations) {
    const sqlText = readFileSync(resolve(__dirname, '../drizzle', file), 'utf8');
    console.log(`\n── Applying ${file} ────────────────────────`);
    console.log(sqlText.trim());
    await sql.unsafe(sqlText);
    console.log(`✓ ${file}`);
  }

  // Verify
  console.log('\n── Verification ────────────────────────────');

  const userRows = await sql`SELECT id, display_name FROM users LIMIT 5`;
  console.log('users:', userRows);

  const agentRows = await sql`SELECT id, user_id, name, risk_level, trading_mode, status FROM agents LIMIT 5`;
  console.log('agents:', agentRows);

  const execRows = await sql`
    SELECT agent_id, user_id, wallet_address, status
    FROM   execution_accounts
    LIMIT  5
  `;
  console.log('execution_accounts:', execRows);

  await sql.end();
  console.log('\n✅ Multi-tenant foundation applied.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
