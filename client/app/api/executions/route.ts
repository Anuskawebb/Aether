import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const orderId = searchParams.get('orderId') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const [rows, countRows] = await Promise.all([
      sql`
        SELECT
          et.id, et.agent_id, et.agent_wallet, et.order_id,
          et.tx_hash, et.chain, et.status as tx_status,
          et.error_message, et.executed_at, et.created_at,
          eo.token_symbol, eo.action, eo.amount_usd, eo.entry_price_usd
        FROM execution_transactions et
        JOIN execution_orders eo ON et.order_id = eo.id
        WHERE (${orderId} = '' OR et.order_id = ${orderId})
        ORDER BY et.executed_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) as total
        FROM execution_transactions et
        WHERE (${orderId} = '' OR et.order_id = ${orderId})
      `,
    ])

    const executions = rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      agentWallet: r.agent_wallet,
      orderId: r.order_id,
      txHash: r.tx_hash,
      chain: r.chain,
      status: r.tx_status,
      errorMessage: r.error_message ?? null,
      executedAt: r.executed_at ? (r.executed_at as Date).toISOString() : null,
      createdAt: (r.created_at as Date).toISOString(),
      tokenSymbol: r.token_symbol,
      action: r.action,
      amountUsd: r.amount_usd,
      entryPriceUsd: r.entry_price_usd,
    }))

    return NextResponse.json({
      executions,
      total: parseInt(countRows[0]?.total as string ?? '0'),
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/executions]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
