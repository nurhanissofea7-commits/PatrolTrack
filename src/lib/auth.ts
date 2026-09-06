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

// Returns the currently logged-in user, or falls back to the default supervisor
// so the demo is immediately viewable without a login wall.
export async function getCurrentUser(): Promise<SessionUser> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value

  if (raw) {
    try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionUser
      // verify the user still exists
      const u = await db.user.findUnique({ where: { id: parsed.id } })
      if (u && u.status === 'ACTIVE') {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as SessionUser['role'],
          guardId: parsed.guardId,
          supervisorId: parsed.supervisorId,
        }
      }
    } catch {
      // ignore corrupt cookie
    }
  }

  // Fallback: default supervisor (Mohd Hafiz)
  const sup = await db.user.findUnique({
    where: { email: 'hafiz@patroltrack.io' },
    include: { supervisor: true, guard: true },
  })
  if (sup) {
    return {
      id: sup.id,
      name: sup.name,
      email: sup.email,
      role: sup.role as SessionUser['role'],
      supervisorId: sup.supervisor?.id ?? null,
      guardId: sup.guard?.id ?? null,
    }
  }
  // Ultimate fallback: admin
  const admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    return { id: admin.id, name: admin.name, email: admin.email, role: 'ADMIN' }
  }
  throw new Error('No users in database — run the seed script.')
}

export function makeSessionCookie(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}
