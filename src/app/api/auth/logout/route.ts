import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  const res = NextResponse.json({ ok: true })
  // Match the same flags used when setting the cookie so the browser accepts the deletion.
  const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:'
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 0,
  })
  return res
}
