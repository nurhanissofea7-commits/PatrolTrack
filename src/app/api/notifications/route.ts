import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { userId: user.id },
        { audience: user.role },
        { audience: 'ALL' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      read: n.read,
      audience: n.audience,
      relatedId: n.relatedId,
      createdAt: n.createdAt,
    })),
  })
}
