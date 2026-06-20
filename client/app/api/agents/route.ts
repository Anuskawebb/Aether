import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

function generateAgentId(): string {
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  return `agent-${hex}`
}

/** GET /api/agents — list all agents owned by the current user */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT
      a.id, a.name, a.status, a.risk_level, a.trading_mode, a.created_at,
      ea.wallet_address, ea.status AS account_status
    FROM agents a
    LEFT JOIN execution_accounts ea ON ea.agent_id = a.id AND ea.status != 'REVOKED'
    WHERE a.user_id = ${user.dbUserId}
      AND a.status  != 'ARCHIVED'
    ORDER BY a.created_at ASC
  `

  return NextResponse.json({
    agents: rows.map((r) => ({
      id:            r.id             as string,
      name:          r.name           as string,
      status:        r.status         as string,
      riskLevel:     r.risk_level     as string,
      tradingMode:   r.trading_mode   as string,
      walletAddress: r.wallet_address as string | null,
      accountStatus: r.account_status as string | null,
      createdAt:     (r.created_at as Date)?.toISOString() ?? null,
    })),
  })
}

/** POST /api/agents — create a new agent (status: DRAFT) */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?:        string
    riskLevel?:   string
    tradingMode?: string
  }

  const name        = (body.name        ?? '').trim()
  const riskLevel   = (body.riskLevel   ?? 'BALANCED').toUpperCase()
  const tradingMode = (body.tradingMode ?? 'AUTONOMOUS').toUpperCase()

  if (!name) {
    return NextResponse.json({ error: 'Agent name is required' }, { status: 422 })
  }

  const validRisk = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']
  const validMode = ['AUTONOMOUS', 'ASSISTED']
  if (!validRisk.includes(riskLevel)) {
    return NextResponse.json({ error: `riskLevel must be one of: ${validRisk.join(', ')}` }, { status: 422 })
  }
  if (!validMode.includes(tradingMode)) {
    return NextResponse.json({ error: `tradingMode must be one of: ${validMode.join(', ')}` }, { status: 422 })
  }

  const agentId = generateAgentId()
  await sql`
    INSERT INTO agents (id, user_id, name, risk_level, trading_mode, status, created_at, updated_at)
    VALUES (${agentId}, ${user.dbUserId}, ${name}, ${riskLevel}, ${tradingMode}, 'DRAFT', NOW(), NOW())
  `

  return NextResponse.json({
    agentId,
    name,
    status:      'DRAFT',
    riskLevel,
    tradingMode,
  }, { status: 201 })
}
