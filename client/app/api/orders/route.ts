import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const validStatuses = ['PENDING', 'PROCESSING', 'FILLED', 'FAILED', 'CANCELLED']
    const filterStatus = validStatuses.includes(status) ? status : ''

    const [rows, countRows] = await Promise.all([
      sql`
        SELECT
          id, agent_id, agent_wallet, recommendation_id,
          token_address, token_symbol, action,
          amount_usd, slippage_limit_pct, position_size_pct,
          entry_price_usd, stop_loss_pct, take_profit_pct,
          status, failure_reason, created_at, updated_at
        FROM execution_orders
        WHERE (${filterStatus} = '' OR status = ${filterStatus})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) as total FROM execution_orders
        WHERE (${filterStatus} = '' OR status = ${filterStatus})
      `,
    ])

    const orders = rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      agentWallet: r.agent_wallet,
      recommendationId: r.recommendation_id,
      tokenAddress: r.token_address,
      token: r.token_symbol,
      action: r.action,
      amountUsd: r.amount_usd,
      slippageLimitPct: r.slippage_limit_pct,
      positionSizePct: r.position_size_pct,
      entryPriceUsd: r.entry_price_usd,
      stopLossPct: r.stop_loss_pct,
      takeProfitPct: r.take_profit_pct,
      status: r.status,
      failureReason: r.failure_reason ?? null,
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString(),
    }))

    return NextResponse.json({
      orders,
      total: parseInt(countRows[0]?.total as string ?? '0'),
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/orders]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
