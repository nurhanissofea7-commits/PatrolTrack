import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  const notifications = await db.notification.findAll()
  const filtered = notifications.filter((n) => n.userId === user.id || n.audience === user.role || n.audience === 'ALL')
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
