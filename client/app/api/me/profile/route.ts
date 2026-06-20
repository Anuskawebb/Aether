import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT
      id, username, display_name, email, profile_image_url,
      experience, goals, risk_tolerance, trading_preference, capital_range,
      onboarding_completed, created_at
    FROM users WHERE id = ${user.dbUserId} LIMIT 1
  `
  if (rows.length === 0) return NextResponse.json({ profile: null })

  const r = rows[0]!
  return NextResponse.json({
    profile: {
      id:                  r.id                   as string,
      username:            r.username              as string | null,
      displayName:         r.display_name          as string | null,
      email:               r.email                 as string | null,
      profileImageUrl:     r.profile_image_url     as string | null,
      experience:          r.experience            as string | null,
      goals:               r.goals                 as string | null,
      riskTolerance:       r.risk_tolerance        as string | null,
      tradingPreference:   r.trading_preference    as string | null,
      capitalRange:        r.capital_range         as string | null,
      onboardingCompleted: r.onboarding_completed  as boolean,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    username?:           string
    displayName?:        string
    profileImageUrl?:    string
    experience?:         string
    goals?:              string
    riskTolerance?:      string
    tradingPreference?:  string
    capitalRange?:       string
    onboardingCompleted?: boolean
  }

  // Validate username if provided
  if (body.username !== undefined) {
    const uname = body.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: letters, numbers, underscores only' },
        { status: 422 },
      )
    }
    // Check uniqueness (exclude self)
    const conflict = await sql`
      SELECT id FROM users
      WHERE LOWER(username) = ${uname} AND id != ${user.dbUserId}
      LIMIT 1
    `
    if (conflict.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    body.username = uname
  }

  await sql`
    UPDATE users SET
      username            = COALESCE(${body.username            ?? null}, username),
      display_name        = COALESCE(${body.displayName         ?? null}, display_name),
      profile_image_url   = COALESCE(${body.profileImageUrl     ?? null}, profile_image_url),
      experience          = COALESCE(${body.experience          ?? null}, experience),
      goals               = COALESCE(${body.goals               ?? null}, goals),
      risk_tolerance      = COALESCE(${body.riskTolerance       ?? null}, risk_tolerance),
      trading_preference  = COALESCE(${body.tradingPreference   ?? null}, trading_preference),
      capital_range       = COALESCE(${body.capitalRange        ?? null}, capital_range),
      onboarding_completed = CASE
        WHEN ${body.onboardingCompleted ?? null} IS NOT NULL
          THEN ${body.onboardingCompleted ?? false}
        ELSE onboarding_completed
      END,
      updated_at = NOW()
    WHERE id = ${user.dbUserId}
  `

  return NextResponse.json({ ok: true })
}
