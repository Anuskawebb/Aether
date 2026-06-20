import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const normalizedAddress = address.toLowerCase()

    const rows = await sql`
      SELECT
        sms.token_address,
        sms.token_symbol,
        sms.accumulation_score,
        sms.signal_tier,
        sms.quality_holder_count,
        sms.holder_count,
        sms.quality_concentration_pct,
        sms.avg_quality_rank_score,
        sms.accumulator_holder_count,
        sms.net_accumulation_flow,
        sms.quality_entry_count_4h,
        sms.quality_exit_count_4h,
        sms.trend_direction,
        sms.meets_minimum_holders,
        sms.narrative,
        sms.computed_at
      FROM smart_money_signals sms
      WHERE sms.token_address = ${normalizedAddress}
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json({ token: null, meta: { timestamp: new Date().toISOString() } })
    }

    const r = rows[0]
    const score = parseFloat(r.accumulation_score as string)
    const avgRank = parseFloat(r.avg_quality_rank_score as string)
    const concPct = parseFloat(r.quality_concentration_pct as string)
    const netFlow = r.net_accumulation_flow as number

    const flowNormalized = Math.min(100, Math.max(0, 50 + netFlow * 2))
    const riskScore = (r.meets_minimum_holders as boolean) ? 65 : 30

    return NextResponse.json({
      token: {
        tokenAddress: r.token_address,
        tokenSymbol: r.token_symbol,
        toroScore: Math.round(score),
        signalTier: r.signal_tier,
        scoreBreakdown: {
          wallet: Math.round(avgRank),
          flow: Math.round(flowNormalized),
          smartMoney: Math.min(100, Math.round(concPct)),
          liquidity: 50,
          risk: riskScore,
        },
        smartMoneyActivity: {
          walletsEntering: r.quality_entry_count_4h as number,
          walletsExiting: r.quality_exit_count_4h as number,
          netFlow,
          convictionScore: Math.round(avgRank),
        },
        qualityHolderCount: r.quality_holder_count as number,
        holderCount: r.holder_count as number,
        accumulationScore: score,
        accumulatorHolderCount: r.accumulator_holder_count as number,
        narrative: r.narrative as string,
        trendDirection: r.trend_direction as string,
        meetsMinimumHolders: r.meets_minimum_holders as boolean,
        computedAt: r.computed_at ? (r.computed_at as Date).toISOString() : null,
      },
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/tokens/[address]]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
