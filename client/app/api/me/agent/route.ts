import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/agent
 * Returns the current user's first active agent and associated wallet.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT
      a.id           AS agent_id,
      a.name         AS agent_name,
      a.risk_level,
      a.trading_mode,
      a.status,
      ea.wallet_address,
      ea.status      AS account_status
    FROM   agents a
    LEFT   JOIN execution_accounts ea ON ea.agent_id = a.id AND ea.status != 'REVOKED'
    WHERE  a.user_id = ${user.dbUserId}
      AND  a.status  != 'ARCHIVED'
    ORDER  BY a.created_at ASC
    LIMIT  1
  `

  if (rows.length === 0) return NextResponse.json({ agent: null })

  const r = rows[0]!
  return NextResponse.json({
    agent: {
      agentId:       r.agent_id       as string,
      agentName:     r.agent_name     as string,
      riskLevel:     r.risk_level     as string,
      tradingMode:   r.trading_mode   as string,
      status:        r.status         as string,
      walletAddress: r.wallet_address as string | null,
      accountStatus: r.account_status as string | null,
    },
  })
}
