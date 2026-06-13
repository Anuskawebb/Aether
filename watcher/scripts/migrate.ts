import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const SQL = `
create table if not exists vaults (
  address          text primary key,
  virtual_usdc     numeric(20,6) not null,
  starting_capital numeric(20,6) not null,
  copy_model_key   text not null default 'fixed_available_pct',
  copy_model_config jsonb not null default '{}'
);

create table if not exists follows (
  follower text not null,
  leader   text not null,
  primary key (follower, leader),
  foreign key (follower) references vaults(address)
);

create table if not exists paper_trades (
  id           uuid primary key default gen_random_uuid(),
  follower     text not null,
  leader       text not null,
  side         text not null,
  token        text not null,
  usdc_spent   numeric(20,6)  not null,
  token_amount numeric(30,10) not null,
  entry_price  numeric(20,10) not null,
  exit_price   numeric(20,10),
  pnl          numeric(20,6),
  status       text not null default 'OPEN',
  tx_hash      text,
  timestamp    timestamptz not null,
  foreign key (follower) references vaults(address)
);

create index if not exists idx_follows_leader  on follows(leader);
create index if not exists idx_trades_follower on paper_trades(follower, status);
create index if not exists idx_trades_open     on paper_trades(leader, follower, token, status);
`;

const HOST     = 'aws-1-ap-northeast-1.pooler.supabase.com';
const USER     = 'postgres.yoiskbyvqdkhqgkrbpon';
const PASSWORD = 'SomniaHackathon';
const DATABASE = 'postgres';

async function run(port: number, label: string) {
  console.log(`\nTrying ${label} (port ${port}) as user "${USER}"…`);
  const client = new Client({
    host:     HOST,
    port,
    user:     USER,
    password: PASSWORD,
    database: DATABASE,
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    console.log('  Connected ✓');
    await client.query(SQL);
    console.log('  Tables created ✓');
    return true;
  } catch (e: any) {
    console.error(`  Failed: ${e.message}`);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const ok = (await run(6543, 'transaction pooler')) || (await run(5432, 'session pooler'));

if (ok) {
  console.log('\nMigration complete. Run: npx prisma generate');
} else {
  console.log('\nAll attempts failed — password is wrong.');
  console.log('Go to: Supabase Dashboard → Settings → Database → Reset database password');
  process.exit(1);
}
