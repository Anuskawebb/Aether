import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const SQL = `
create table if not exists leader_swaps (
  id          uuid primary key default gen_random_uuid(),
  leader      text not null,
  side        text not null,
  token_in    text not null,
  token_out   text not null,
  usd_value   numeric(20,6)  not null,
  wsomi_price numeric(20,10) not null,
  tx_hash     text,
  timestamp   timestamptz not null,
  created_at  timestamptz default now()
);

create index if not exists idx_leader_swaps_leader_ts
  on leader_swaps(leader, timestamp desc);
`;

const client = new Client({
  host:     'aws-1-ap-northeast-1.pooler.supabase.com',
  port:     6543,
  user:     'postgres.yoiskbyvqdkhqgkrbpon',
  password: 'SomniaHackathon',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(SQL);
console.log('leader_swaps table created ✓');
await client.end();
