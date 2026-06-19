import { db } from '../src/client.js';
import { sql } from 'drizzle-orm';

async function main() {
  const [sigs, pos, orders, recs, wallets, portfolio] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) as cnt FROM smart_money_signals WHERE meets_minimum_holders = true`),
    db.execute(sql`SELECT COUNT(*) as cnt FROM agent_positions WHERE status = 'OPEN'`),
    db.execute(sql`SELECT COUNT(*) as cnt FROM execution_orders`),
    db.execute(sql`SELECT COUNT(*) as cnt FROM trade_recommendations WHERE status = 'PENDING'`),
    db.execute(sql`SELECT COUNT(*) as cnt FROM wallet_scores`),
    db.execute(sql`SELECT agent_wallet, portfolio_usd FROM portfolio_state ORDER BY updated_at DESC LIMIT 1`),
  ]);
  console.log(JSON.stringify({
    signals_meeting_minimum: sigs.rows[0]?.cnt,
    open_positions: pos.rows[0]?.cnt,
    execution_orders: orders.rows[0]?.cnt,
    pending_recs: recs.rows[0]?.cnt,
    wallet_scores: wallets.rows[0]?.cnt,
    portfolio: portfolio.rows[0] ?? null,
  }, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
