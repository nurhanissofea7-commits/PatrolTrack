import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  const notifications = await db.notification.findAll()

  // Define which notification types are "operational" (for supervisors) vs "system-level" (for admins)
  const OPERATIONAL_TYPES = [
    'PATROL_STARTING', 'PATROL_COMPLETE', 'MISSED_CHECKPOINT', 'LATE_CHECKPOINT',
    'INVALID_VERIFICATION', 'INCIDENT', 'SOS', 'GUARD_OFFLINE', 'SUSPICIOUS',
  ]
  const SYSTEM_TYPES = ['USER_LOGIN', 'LOGIN_FAILED', 'USER_MODIFY', 'USER_CREATE', 'SCHEDULE_CREATE', 'SETTINGS_UPDATE']

  const filtered = notifications.filter((n) => {
    // Personal notifications always show
    if (n.userId === user.id) return true
    // Announcements for everyone
    if (n.type === 'ANNOUNCEMENT' || n.audience === 'ALL') return true

    // Admins only see system-level notifications
    if (user.role === 'ADMIN') {
      return SYSTEM_TYPES.includes(n.type)
    }

    // Supervisors see operational notifications
    if (user.role === 'SUPERVISOR') {
      return OPERATIONAL_TYPES.includes(n.type)
    }

    // Guards see their own operational notifications
    return OPERATIONAL_TYPES.includes(n.type)
  })

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return NextResponse.json({
    notifications: filtered.slice(0, 50).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      read: n.read ?? false,
      audience: n.audience,
      relatedId: n.relatedId ?? null,
      createdAt: n.createdAt,
    })),
  })
}
