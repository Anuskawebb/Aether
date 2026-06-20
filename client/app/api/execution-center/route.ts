import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [statsRows, queueRows, portfolioRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS total_orders,
          COUNT(*) FILTER (WHERE status = 'FILLED')::int AS filled_orders,
          COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed_orders,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_orders,
          COUNT(*) FILTER (WHERE status = 'PROCESSING')::int AS processing_orders
        FROM execution_orders
      `,
      sql`
        SELECT
          eo.id, eo.token_symbol, eo.action, eo.amount_usd,
          eo.status, eo.entry_price_usd, eo.created_at,
          et.tx_hash, et.status as tx_status
        FROM execution_orders eo
        LEFT JOIN execution_transactions et ON et.order_id = eo.id
        ORDER BY eo.created_at DESC
        LIMIT 20
      `,
      sql`
        SELECT open_positions, portfolio_usd, drawdown_pct, open_risk_pct
        FROM portfolio_state
        ORDER BY updated_at DESC
        LIMIT 1
      `,
    ])

    const s = statsRows[0]
    const total = (s?.total_orders as number) ?? 0
    const filled = (s?.filled_orders as number) ?? 0
    const failed = (s?.failed_orders as number) ?? 0

    const queue = queueRows.map((r) => ({
      id: r.id,
      token: r.token_symbol,
      action: r.action,
      amountUsd: r.amount_usd,
      entryPriceUsd: r.entry_price_usd,
      status: r.status,
      txHash: r.tx_hash ?? null,
      txStatus: r.tx_status ?? null,
      createdAt: r.created_at ? (r.created_at as Date).toISOString() : null,
    }))

    const portfolio = portfolioRows[0] ?? null

    return NextResponse.json({
      stats: {
        ordersProcessed: total,
        ordersFilled: filled,
        ordersFailed: failed,
        ordersPending: (s?.pending_orders as number) ?? 0,
        ordersProcessing: (s?.processing_orders as number) ?? 0,
        successRate: total > 0 ? Math.round((filled / total) * 100) : 0,
        openPositions: (portfolio?.open_positions as number) ?? 0,
        portfolioUsd: (portfolio?.portfolio_usd as number) ?? 0,
        drawdownPct: (portfolio?.drawdown_pct as number) ?? 0,
        openRiskPct: (portfolio?.open_risk_pct as number) ?? 0,
      },
      queue,
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/execution-center]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
