// PatrolTrack – Server-side auth helper (Firebase + token-based session)
import { headers, cookies } from 'next/headers'
import { db } from './firebase'

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
    const u = await db.user.findById(parsed.id)
    if (u && u.status === 'ACTIVE') {
      // Look up guard/supervisor records
      const guard = await db.guard.findOne('userId', u.id)
      const supervisor = await db.supervisor.findOne('userId', u.id)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as SessionUser['role'],
        guardId: guard?.id ?? null,
        supervisorId: supervisor?.id ?? null,
      }
    }
  } catch {
    // ignore corrupt token
  }
  return null
}

// Returns the currently logged-in user, or null when signed out.
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
