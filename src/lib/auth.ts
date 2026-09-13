// PatrolTrack – Server-side auth helper (token-based session)
import { cookies, headers } from 'next/headers'
import { db } from './db'

export const SESSION_COOKIE = 'pt_session'
export const SESSION_HEADER = 'x-session'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'GUARD'
  guardId?: string | null
  supervisorId?: string | null
}

// Decode a base64 session token and verify the user still exists.
async function decodeSession(raw: string): Promise<SessionUser | null> {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionUser
    const u = await db.user.findUnique({
      where: { id: parsed.id },
      include: { supervisor: true, guard: true },
    })
    if (u && u.status === 'ACTIVE') {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as SessionUser['role'],
        guardId: u.guard?.id ?? null,
        supervisorId: u.supervisor?.id ?? null,
      }
    }
  } catch {
    // ignore corrupt token
  }
  return null
}

// Returns the currently logged-in user, or null when signed out.
// Reads the session token from the x-session header first (works in all
// environments including embedded HTTPS preview iframes), then falls back
// to the cookie for same-origin requests.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const headerStore = await headers()
  const headerToken = headerStore.get(SESSION_HEADER)
  if (headerToken) {
    const user = await decodeSession(headerToken)
    if (user) return user
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (raw) {
    return decodeSession(raw)
  }
  return null
}

export function makeSessionToken(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

// Keep the old name as an alias so existing imports don't break.
export const makeSessionCookie = makeSessionToken
