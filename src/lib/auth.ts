// PatrolTrack – Server-side auth helper (cookie-based mock session)
import { cookies } from 'next/headers'
import { db } from './db'

export const SESSION_COOKIE = 'pt_session'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'GUARD'
  guardId?: string | null
  supervisorId?: string | null
}

// Returns the currently logged-in user, or null when signed out.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value

  if (!raw) return null

  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionUser
    // verify the user still exists
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
    // ignore corrupt cookie
  }
  return null
}

export function makeSessionCookie(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}
