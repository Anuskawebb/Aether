import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const normalizedAddress = address.toLowerCase()
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50)

    const rows = await sql`
      SELECT
        eo.id, eo.agent_wallet, eo.action, eo.amount_usd,
        eo.entry_price_usd, eo.status, eo.created_at,
        tr.confidence
      FROM execution_orders eo
      LEFT JOIN trade_recommendations tr ON eo.recommendation_id = tr.id
      WHERE eo.token_address = ${normalizedAddress}
      ORDER BY eo.created_at DESC
      LIMIT ${limit}
    `

    const activity = rows.map((r) => ({
      id: r.id,
      wallet: (r.agent_wallet as string).slice(0, 6) + '...' + (r.agent_wallet as string).slice(-4),
      action: r.action,
      amountUsd: r.amount_usd,
      entryPriceUsd: r.entry_price_usd,
      status: r.status,
      createdAt: (r.created_at as Date).toISOString(),
      confidence: r.confidence != null ? Math.round((r.confidence as number) * 100) : null,
    }))

    return NextResponse.json({
      activity,
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/tokens/[address]/activity]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
