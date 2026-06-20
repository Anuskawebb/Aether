import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') ?? 'OPEN'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const validStatus = ['OPEN', 'CLOSED'].includes(status) ? status : 'OPEN'

    const [rows, countRows] = await Promise.all([
      sql`
        SELECT
          id, agent_wallet, token_address, token_symbol,
          entry_price_usd, current_price_usd, position_size_usd, position_size_pct,
          unrealized_pnl_pct, stop_loss_pct, take_profit_pct,
          status, close_reason, close_price_usd,
          opened_at, closed_at, updated_at
        FROM agent_positions
        WHERE status = ${validStatus}
        ORDER BY opened_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) as total FROM agent_positions WHERE status = ${validStatus}
      `,
    ])

    const positions = rows.map((r) => {
      const sizeUsd = r.position_size_usd as number
      const pnlPct = r.unrealized_pnl_pct as number
      return {
        id: r.id,
        agentWallet: r.agent_wallet,
        tokenAddress: r.token_address,
        token: r.token_symbol,
        entryPriceUsd: r.entry_price_usd,
        currentPriceUsd: r.current_price_usd,
        positionSizeUsd: sizeUsd,
        positionSizePct: r.position_size_pct,
        allocation: r.position_size_pct,
        unrealizedPnlPct: pnlPct,
        unrealizedPnlUsd: Math.round(sizeUsd * pnlPct / 100 * 100) / 100,
        stopLossPct: r.stop_loss_pct,
        takeProfitPct: r.take_profit_pct,
        status: r.status,
        closeReason: r.close_reason ?? null,
        closePriceUsd: r.close_price_usd ?? null,
        openedAt: (r.opened_at as Date).toISOString(),
        closedAt: r.closed_at ? (r.closed_at as Date).toISOString() : null,
        value: sizeUsd,
        pnl: Math.round(sizeUsd * pnlPct / 100 * 100) / 100,
      }
    })

    return NextResponse.json({
      positions,
      total: parseInt(countRows[0]?.total as string ?? '0'),
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/positions]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
