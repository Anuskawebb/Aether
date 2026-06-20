import { NextRequest, NextResponse } from 'next/server'
import { twakGetPortfolio } from '@/lib/twak'
import { requireAgentOwnership } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise

  const ownership = await requireAgentOwnership(req, params.id)
  if (ownership instanceof NextResponse) return ownership

  try {
    const portfolio = await twakGetPortfolio()

    if (!portfolio) {
      return NextResponse.json({
        totalValueUsd: '0',
        assets:        [],
      })
    }

    return NextResponse.json({
      totalValueUsd: portfolio.totalUsdValue,
      assets:        portfolio.assets,
    })

  } catch (err) {
    console.error(`[api/agents/${params.id}/wallet/portfolio] error:`, err)
    return NextResponse.json({ error: 'Failed to fetch portfolio', code: 'TWAK_ERROR' }, { status: 503 })
  }
}
