import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { twakGetAddress } from '@/lib/twak'
import { requireAgentOwnership } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

/**
 * Normalise whatever postgres.js returns for a jsonb column into a plain object.
 * Handles: JS object (jsonb object), string (jsonb string / legacy), array
 * (corrupted from a bad || merge) by merging all array elements.
 */
function parseMeta(raw: unknown): Record<string, string> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, string> } catch { return {} }
  }
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, string>>((acc, item) => ({ ...acc, ...parseMeta(item) }), {})
  }
  return raw as Record<string, string>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: agentId } = await params

  const ownership = await requireAgentOwnership(req, agentId)
  if (ownership instanceof NextResponse) return ownership

  try {
    const rows = await sql`
      SELECT id, agent_id, account_type, wallet_address, status, metadata, created_at
      FROM execution_accounts
      WHERE agent_id = ${agentId}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ account: null }, { status: 404 })
    }

    const r    = rows[0]
    const meta = parseMeta(r.metadata)

    return NextResponse.json({
      agentId:       r.agent_id       as string,
      walletAddress: r.wallet_address  as string,
      status:        r.status          as string,
      accountType:   r.account_type    as string,
      agentName:     meta.agentName   ?? null,
      riskLevel:     meta.riskLevel   ?? null,
      tradingMode:   meta.tradingMode  ?? null,
      metadata:      meta,
      createdAt:     r.created_at ? (r.created_at as Date).toISOString() : null,
    })

  } catch (err) {
    console.error('[api/agents/wallet] GET error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}

/**
 * POST — create or return the execution_accounts record for this agent.
 *
 * Optional body: { agentName, riskLevel, tradingMode }
 * These are merged into the metadata column on both new and existing records.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: agentId } = await params

  const ownership = await requireAgentOwnership(req, agentId)
  if (ownership instanceof NextResponse) return ownership

  let agentName: string | undefined
  let riskLevel: string | undefined
  let tradingMode: string | undefined
  try {
    const body = await req.json()
    agentName   = body.agentName   || undefined
    riskLevel   = body.riskLevel   || undefined
    tradingMode = body.tradingMode || undefined
  } catch {
    // No body — config fields stay undefined
  }

  const configPatch: Record<string, string> = {}
  if (agentName)   configPatch.agentName   = agentName
  if (riskLevel)   configPatch.riskLevel   = riskLevel
  if (tradingMode) configPatch.tradingMode = tradingMode

  try {
    const existing = await sql`
      SELECT id, agent_id, account_type, wallet_address, status, metadata
      FROM execution_accounts
      WHERE agent_id = ${agentId}
      LIMIT 1
    `

    if (existing.length > 0) {
      const r = existing[0]

      // Merge config using JS (avoids jsonb || operator issues with jsonb strings)
      const currentMeta = parseMeta(r.metadata)
      const merged      = { ...currentMeta, ...configPatch }

      if (Object.keys(configPatch).length > 0) {
        const mergedJson = JSON.stringify(merged)
        await sql`
          UPDATE execution_accounts
          SET
            metadata   = ${mergedJson}::jsonb,
            updated_at = NOW()
          WHERE agent_id = ${agentId}
        `
      }

      return NextResponse.json({
        agentId:       r.agent_id      as string,
        walletAddress: r.wallet_address as string,
        status:        r.status         as string,
        accountType:   r.account_type   as string,
        agentName:     merged.agentName   ?? null,
        riskLevel:     merged.riskLevel   ?? null,
        tradingMode:   merged.tradingMode ?? null,
        created:       false,
      })
    }

    // New account — fetch wallet address from TWAK
    const walletAddress = await twakGetAddress()
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'TWAK sidecar unreachable or no BSC address configured' },
        { status: 503 },
      )
    }

    const id       = crypto.randomUUID()
    const now      = new Date().toISOString()
    const metadata = JSON.stringify({ chain: 'smartchain', createdBy: 'api', ...configPatch })

    await sql`
      INSERT INTO execution_accounts (id, agent_id, account_type, wallet_address, status, metadata, created_at, updated_at)
      VALUES (
        ${id},
        ${agentId},
        ${'TWAK_AGENT'},
        ${walletAddress.toLowerCase()},
        ${'ACTIVE'},
        ${metadata}::jsonb,
        ${now}::timestamp,
        ${now}::timestamp
      )
      ON CONFLICT DO NOTHING
    `

    // Promote agent from DRAFT → PENDING_FUNDING now that it has an execution account
    await sql`
      UPDATE agents SET status = 'PENDING_FUNDING', updated_at = NOW()
      WHERE id = ${agentId} AND status = 'DRAFT'
    `

    return NextResponse.json({
      agentId,
      walletAddress: walletAddress.toLowerCase(),
      status:        'ACTIVE',
      accountType:   'TWAK_AGENT',
      agentName:     agentName   ?? null,
      riskLevel:     riskLevel   ?? null,
      tradingMode:   tradingMode ?? null,
      created:       true,
    }, { status: 201 })

  } catch (err) {
    console.error('[api/agents/wallet] POST error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
