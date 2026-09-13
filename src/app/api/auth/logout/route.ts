import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  // The real session token lives in localStorage on the client and is cleared
  // there on logout. We also clear the fallback cookie here for completeness.
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
