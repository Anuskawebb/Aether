import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOwnership } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/agents/[id]/config — returns token + trader watchlists */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const result = await requireAgentOwnership(req, agentId)
  if (result instanceof NextResponse) return result

  const [tokens, traders] = await Promise.all([
    sql`SELECT address, symbol, name FROM agent_token_watchlist  WHERE agent_id = ${agentId} ORDER BY added_at`,
    sql`SELECT wallet,  label        FROM agent_trader_watchlist WHERE agent_id = ${agentId} ORDER BY added_at`,
  ])

  return NextResponse.json({
    tokens:  tokens.map((r) => ({ address: r.address as string, symbol: r.symbol as string, name: r.name as string })),
    traders: traders.map((r) => ({ wallet: r.wallet as string, label: r.label as string | null })),
  })
}

/** PUT /api/agents/[id]/config — replaces watchlists wholesale */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const result = await requireAgentOwnership(req, agentId)
  if (result instanceof NextResponse) return result

  const body = await req.json() as {
    tokens?:  { address: string; symbol: string; name?: string }[]
    traders?: { wallet: string; label?: string }[]
  }

  const tokens  = (body.tokens  ?? []).slice(0, 20)
  const traders = (body.traders ?? []).slice(0, 10)

  await sql.begin(async (tx) => {
    await tx`DELETE FROM agent_token_watchlist  WHERE agent_id = ${agentId}`
    await tx`DELETE FROM agent_trader_watchlist WHERE agent_id = ${agentId}`

    if (tokens.length > 0) {
      await tx`
        INSERT INTO agent_token_watchlist (agent_id, address, symbol, name)
        SELECT ${agentId}, t.address, t.symbol, COALESCE(t.name, '')
        FROM   jsonb_to_recordset(${JSON.stringify(tokens)}::jsonb)
               AS t(address text, symbol text, name text)
        ON CONFLICT (agent_id, address) DO NOTHING
      `
    }

    if (traders.length > 0) {
      await tx`
        INSERT INTO agent_trader_watchlist (agent_id, wallet, label)
        SELECT ${agentId}, t.wallet, t.label
        FROM   jsonb_to_recordset(${JSON.stringify(traders)}::jsonb)
               AS t(wallet text, label text)
        ON CONFLICT (agent_id, wallet) DO NOTHING
      `
    }
  })

  return NextResponse.json({ ok: true, tokenCount: tokens.length, traderCount: traders.length })
}
