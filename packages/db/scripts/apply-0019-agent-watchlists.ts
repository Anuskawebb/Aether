import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Load env files without override so a shell-passed DATABASE_URL takes precedence
dotenv.config({ path: resolve(__dirname, '../../client/.env.local') })
dotenv.config({ path: resolve(__dirname, '../../../.env.local') })
dotenv.config({ path: resolve(__dirname, '../../../.env') })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })

const migrationPath = resolve(__dirname, '../drizzle/0019_agent_watchlists.sql')
const migrationSql  = readFileSync(migrationPath, 'utf8')

const statements = migrationSql
  .split(';')
  .map((s) =>
    // strip leading comment lines, keep the actual SQL
    s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim()
  )
  .filter((s) => s.length > 0)

try {
  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 60) + '…')
    await sql.unsafe(stmt)
  }
  console.log('✓ Migration 0019 applied successfully')
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
} finally {
  await sql.end()
}
