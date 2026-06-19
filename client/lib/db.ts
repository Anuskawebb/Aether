import postgres from 'postgres'

const url = process.env.DATABASE_URL

if (!url && process.env.NODE_ENV !== 'test') {
  console.warn('[toro] DATABASE_URL is not set — DB queries will fail')
}

const isPooler = url?.includes('pgbouncer') || url?.includes('pooler.supabase')
const ssl =
  url?.includes('supabase') || url?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined

// Shared singleton across all route bundles in Next.js dev (Turbopack splits modules per route)
declare global { var __toroSql: postgres.Sql | undefined }

const sql: postgres.Sql =
  globalThis.__toroSql ??
  postgres(url ?? '', {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    ssl,
    prepare: !isPooler,
  })

if (process.env.NODE_ENV !== 'production') globalThis.__toroSql = sql

export default sql
