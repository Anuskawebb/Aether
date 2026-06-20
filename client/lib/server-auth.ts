import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/node'
import sql from '@/lib/db'

const APP_ID     = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ''
const APP_SECRET = process.env.PRIVY_APP_SECRET         ?? ''

let _privy: PrivyClient | null = null
function getPrivy(): PrivyClient {
  if (!_privy) _privy = new PrivyClient({ appId: APP_ID, appSecret: APP_SECRET })
  return _privy
}

export interface AuthUser {
  privyUserId: string
  dbUserId:    string
}

export interface AuthedAgent extends AuthUser {
  dbAgentId: string
}

function extractToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

/** Verifies the Privy JWT and looks up the user row. Returns null if unauthenticated. */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  if (!APP_ID || !APP_SECRET) return null
  const token = extractToken(req)
  if (!token) return null
  try {
    const claims = await getPrivy().utils().auth().verifyAccessToken(token)
    const rows   = await sql`SELECT id FROM users WHERE privy_id = ${claims.user_id} LIMIT 1`
    if (rows.length === 0) return null
    return { privyUserId: claims.user_id, dbUserId: rows[0]!.id as string }
  } catch {
    return null
  }
}

/**
 * Verifies auth AND confirms the agentId in the URL belongs to this user.
 * Returns NextResponse (401/403) on failure; caller must return it immediately.
 */
export async function requireAgentOwnership(
  req:     NextRequest,
  agentId: string,
): Promise<AuthedAgent | NextResponse> {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id FROM agents WHERE id = ${agentId} AND user_id = ${user.dbUserId}
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return { ...user, dbAgentId: agentId }
}

/** For provision route — verifies JWT only, does not require a DB user row yet. */
export async function verifyPrivyToken(req: NextRequest): Promise<string | null> {
  if (!APP_ID || !APP_SECRET) return null
  const token = extractToken(req)
  if (!token) return null
  try {
    const claims = await getPrivy().utils().auth().verifyAccessToken(token)
    return claims.user_id
  } catch {
    return null
  }
}

// Keep getAuthedUser as alias for backward compat with any routes that reference it
export { getAuthUser as getAuthedUser }
