import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { twakIsReachable, twakGetAddress, twakGetBalance } from '@/lib/twak'
import { computeReadiness } from '@/lib/readiness'
import { requireAgentOwnership } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params: paramsPromise }: RouteParams) {
  const { id: agentId } = await paramsPromise

  const ownership = await requireAgentOwnership(req, agentId)
  if (ownership instanceof NextResponse) return ownership

  try {
    // Parallel fetch: DB wallet record + TWAK liveness + balance
    const [accountRows, twakReachable, balance] = await Promise.all([
      sql`
        SELECT wallet_address, status
        FROM execution_accounts
        WHERE agent_id = ${agentId}
        LIMIT 1
      `,
      twakIsReachable(),
      twakGetBalance().catch(() => null),
    ])

    const walletAddress    = (accountRows[0]?.wallet_address as string) ?? null
    const currentBalanceBnb = balance ? parseFloat(balance.balance) : 0

    const readiness = computeReadiness({
      walletAddress,
      twakConnected:    twakReachable,
      currentBalanceBnb,
    })

    // Auto-update account status if it changed
    if (walletAddress && readiness.walletFunded) {
      await sql`
        UPDATE execution_accounts
        SET status = 'ACTIVE', updated_at = NOW()
        WHERE agent_id = ${agentId} AND status != 'ACTIVE'
      `.catch(() => {})
    } else if (walletAddress && !readiness.walletFunded) {
      await sql`
        UPDATE execution_accounts
        SET status = 'PENDING', updated_at = NOW()
        WHERE agent_id = ${agentId} AND status = 'ACTIVE'
      `.catch(() => {})
    }

    return NextResponse.json(readiness)

  } catch (err) {
    console.error(`[api/agents/${agentId}/readiness] error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
