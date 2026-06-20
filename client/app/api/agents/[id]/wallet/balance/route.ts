import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { twakGetBalance } from '@/lib/twak'
import { MIN_REQUIRED_BNB } from '@/lib/readiness'
import { requireAgentOwnership } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params: paramsPromise }: RouteParams) {
  const params  = await paramsPromise
  const agentId = params.id

  const ownership = await requireAgentOwnership(req, agentId)
  if (ownership instanceof NextResponse) return ownership

  try {
    const balance = await twakGetBalance()

    if (!balance) {
      return NextResponse.json({
        nativeBalance:      '0',
        nativeSymbol:       'BNB',
        usdValue:           null,
        tokens:             [],
        funded:             false,
        bnb:                0,
        minimumRequiredBnb: MIN_REQUIRED_BNB,
      })
    }

    const currentBnb = parseFloat(balance.balance)
    const funded     = currentBnb >= MIN_REQUIRED_BNB

    await sql`
      UPDATE execution_accounts
      SET
        status     = ${funded ? 'ACTIVE' : 'PENDING'},
        updated_at = NOW()
      WHERE agent_id = ${agentId}
        AND status != ${funded ? 'ACTIVE' : 'PENDING'}
    `.catch(() => {})

    return NextResponse.json({
      nativeBalance:      balance.balance,
      nativeSymbol:       balance.symbol,
      usdValue:           balance.usdValue ?? null,
      tokens:             [],
      funded,
      bnb:                currentBnb,
      minimumRequiredBnb: MIN_REQUIRED_BNB,
    })

  } catch (err) {
    console.error(`[api/agents/${agentId}/wallet/balance] error:`, err)
    return NextResponse.json({ error: 'Failed to fetch balance', code: 'TWAK_ERROR' }, { status: 503 })
  }
}
