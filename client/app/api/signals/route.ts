import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

function tierToRisk(tier: string): 'Low' | 'Medium' | 'High' {
  if (tier === 'STRONG') return 'Low'
  if (tier === 'MODERATE') return 'Medium'
  return 'High'
}

function tierToSignal(tier: string): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
  if (tier === 'STRONG') return 'Strong Buy'
  if (tier === 'MODERATE') return 'Buy'
  if (tier === 'WEAK') return 'Hold'
  return 'Sell'
}

function trendLabel(dir: string): 'Increasing' | 'Stable' | 'Decreasing' {
  if (dir === 'INCREASING') return 'Increasing'
  if (dir === 'DECREASING') return 'Decreasing'
  return 'Stable'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0')
    const search = searchParams.get('search')?.toLowerCase() ?? ''
    const riskTier = searchParams.get('riskTier') ?? ''
    const signalTier = searchParams.get('signalTier') ?? ''

    const rows = await sql`
      SELECT
        token_address,
        token_symbol,
        signal_tier,
        accumulation_score,
        quality_holder_count,
        net_accumulation_flow,
        trend_direction,
        meets_minimum_holders,
        avg_quality_rank_score,
        quality_holder_change_24h,
        computed_at
      FROM smart_money_signals
      WHERE meets_minimum_holders = true
        AND (${search} = '' OR LOWER(token_symbol) LIKE ${'%' + search + '%'})
        AND (${signalTier} = '' OR signal_tier = ${signalTier})
      ORDER BY accumulation_score DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countRows = await sql`
      SELECT COUNT(*) as total
      FROM smart_money_signals
      WHERE meets_minimum_holders = true
        AND (${search} = '' OR LOWER(token_symbol) LIKE ${'%' + search + '%'})
        AND (${signalTier} = '' OR signal_tier = ${signalTier})
    `

    const signals = rows.map((r) => {
      const score = Math.round(parseFloat(r.accumulation_score as string))
      const tier = r.signal_tier as string
      const risk = tierToRisk(tier)

      if (riskTier && risk !== riskTier) return null

      return {
        tokenAddress: r.token_address,
        token: r.token_symbol,
        score,
        risk,
        signal: tierToSignal(tier),
        confidence: Math.min(100, Math.round(parseFloat(r.avg_quality_rank_score as string) ?? 0)),
        smartWallets: r.quality_holder_count as number,
        trend: trendLabel(r.trend_direction as string),
        change24h: (r.quality_holder_change_24h as number | null) ?? 0,
        accumulationScore: parseFloat(r.accumulation_score as string),
        signalTier: tier,
        netAccumulationFlow: r.net_accumulation_flow as number,
        computedAt: (r.computed_at as Date).toISOString(),
      }
    }).filter(Boolean)

    return NextResponse.json({
      signals,
      total: parseInt(countRows[0]?.total as string ?? '0'),
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/signals]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
