import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/server-auth'
import sql from '@/lib/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const privyUserId = await verifyPrivyToken(req)
  if (!privyUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let email:            string | undefined
  let displayName:      string | undefined
  let profileImageUrl:  string | undefined
  try {
    const body      = await req.json() as { email?: string; displayName?: string; profileImageUrl?: string }
    email           = body.email           || undefined
    displayName     = body.displayName     || undefined
    profileImageUrl = body.profileImageUrl || undefined
  } catch { /* body is optional */ }

  try {
    // 1. Look up by privy_id first
    const existing = await sql`
      SELECT id, onboarding_completed, username
      FROM   users
      WHERE  privy_id = ${privyUserId}
      LIMIT  1
    `

    let userId:              string
    let onboardingCompleted: boolean
    let username:            string | null

    if (existing.length > 0) {
      userId              = existing[0]!.id                   as string
      onboardingCompleted = existing[0]!.onboarding_completed as boolean
      username            = existing[0]!.username             as string | null

      // Update mutable profile fields without overwriting existing values
      await sql`
        UPDATE users
        SET email             = COALESCE(${email           ?? null}, email),
            display_name      = COALESCE(${displayName     ?? null}, display_name),
            profile_image_url = COALESCE(${profileImageUrl ?? null}, profile_image_url),
            updated_at        = NOW()
        WHERE id = ${userId}
      `
    } else {
      // New user — resolve email conflict before inserting
      let resolvedEmail: string | null = email ?? null
      if (resolvedEmail) {
        const conflict = await sql`SELECT id FROM users WHERE email = ${resolvedEmail} LIMIT 1`
        if (conflict.length > 0) resolvedEmail = null
      }

      userId              = randomUUID()
      onboardingCompleted = false
      username            = null

      await sql`
        INSERT INTO users (id, privy_id, email, display_name, profile_image_url, onboarding_completed, created_at, updated_at)
        VALUES (
          ${userId},
          ${privyUserId},
          ${resolvedEmail},
          ${displayName    ?? null},
          ${profileImageUrl ?? null},
          FALSE,
          NOW(),
          NOW()
        )
      `
    }

    return NextResponse.json({ userId, onboardingCompleted, username, privyUserId })
  } catch (err) {
    console.error('[auth/provision] DB error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
