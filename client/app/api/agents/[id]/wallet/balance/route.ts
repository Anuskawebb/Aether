import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { twakGetBalance } from '@/lib/twak'
import { MIN_REQUIRED_BNB } from '@/lib/readiness'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise
  const agentId = params.id

  try {
    const balance = await twakGetBalance()

    if (!balance) {
      return NextResponse.json({
        nativeBalance: '0',
        nativeSymbol:  'BNB',
        usdValue:      null,
        tokens:        [],
        funded:        false,
      })
    }

    const currentBnb = parseFloat(balance.balance)
    const funded     = currentBnb >= MIN_REQUIRED_BNB

    // Auto-update execution_accounts status based on live balance
    await sql`
      UPDATE execution_accounts
      SET
        status     = ${funded ? 'ACTIVE' : 'PENDING'},
        updated_at = NOW()
      WHERE agent_id = ${agentId}
        AND status != ${funded ? 'ACTIVE' : 'PENDING'}
    `.catch(() => {/* non-critical — don't fail the balance response */})

    return NextResponse.json({
      nativeBalance: balance.balance,
      nativeSymbol:  balance.symbol,
      usdValue:      balance.usdValue ?? null,
      tokens:        [],
      funded,
    })

  } catch (err) {
    console.error(`[api/agents/${agentId}/wallet/balance] error:`, err)
    return NextResponse.json({ error: 'Failed to fetch balance', code: 'TWAK_ERROR' }, { status: 503 })
  }
}
