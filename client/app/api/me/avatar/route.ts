import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getAuthUser } from '@/lib/server-auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') ?? ''
  if (!ALLOWED.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  const body = await req.arrayBuffer()
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 2 MB)' }, { status: 413 })
  }

  const ext      = contentType.split('/')[1]!.replace('jpeg', 'jpg')
  const filename = `avatars/${user.dbUserId}.${ext}`

  const blob = await put(filename, Buffer.from(body), {
    access:      'public',
    contentType,
    addRandomSuffix: false, // deterministic URL so re-uploads overwrite
  })

  await sql`
    UPDATE users SET profile_image_url = ${blob.url}, updated_at = NOW()
    WHERE id = ${user.dbUserId}
  `

  return NextResponse.json({ url: blob.url })
}
