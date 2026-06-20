import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50)
    const rows  = await sql`
      SELECT wallet, rank_score, classification, trade_count, active_days
      FROM   wallet_scores
      ORDER  BY rank_score DESC
      LIMIT  ${limit}
    `
    return NextResponse.json({
      traders: rows.map((r) => ({
        wallet:         r.wallet         as string,
        rankScore:      r.rank_score     as string,
        classification: r.classification as string,
        tradeCount:     r.trade_count    as number,
        activeDays:     r.active_days    as number,
      })),
    })
  } catch (err) {
    console.error('[api/traders]', err)
    return NextResponse.json({ traders: [] })
  }
}
