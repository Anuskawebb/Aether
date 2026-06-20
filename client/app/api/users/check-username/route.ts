import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.trim().toLowerCase() ?? ''

  if (!username) {
    return NextResponse.json({ available: false, error: 'username required' })
  }

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json({ available: false, error: 'invalid format' })
  }

  const rows = await sql`
    SELECT id FROM users
    WHERE LOWER(username) = ${username} AND id != ${user.dbUserId}
    LIMIT 1
  `

  return NextResponse.json({ available: rows.length === 0, username })
}
