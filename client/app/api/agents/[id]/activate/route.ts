import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOwnership } from '@/lib/server-auth'
import sql from '@/lib/db'
import { MIN_REQUIRED_BNB } from '@/lib/readiness'
import { twakGetBalance } from '@/lib/twak'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const result = await requireAgentOwnership(req, agentId)
  if (result instanceof NextResponse) return result

  // Must be in PENDING_FUNDING status
  const rows = await sql`
    SELECT a.status, ea.wallet_address
    FROM   agents a
    LEFT   JOIN execution_accounts ea ON ea.agent_id = a.id AND ea.status != 'REVOKED'
    WHERE  a.id = ${agentId}
    LIMIT  1
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { status, wallet_address } = rows[0]!
  if (status === 'ACTIVE') return NextResponse.json({ status: 'ACTIVE' })
  if (status !== 'PENDING_FUNDING') {
    return NextResponse.json({ error: `Cannot activate agent in status ${status}` }, { status: 400 })
  }
  if (!wallet_address) {
    return NextResponse.json({ error: 'No execution account — create wallet first' }, { status: 400 })
  }

  // Verify balance via TWAK before activating
  const balResult = await twakGetBalance().catch(() => null)
  if (balResult) {
    const bnb = parseFloat(balResult.balance)
    if (bnb < MIN_REQUIRED_BNB) {
      return NextResponse.json(
        { error: `Insufficient balance. Need ${MIN_REQUIRED_BNB} BNB, have ${bnb.toFixed(6)} BNB` },
        { status: 402 },
      )
    }
  }

  await sql`
    UPDATE agents SET status = 'ACTIVE', updated_at = NOW()
    WHERE  id = ${agentId} AND status = 'PENDING_FUNDING'
  `

  return NextResponse.json({ status: 'ACTIVE' })
}
