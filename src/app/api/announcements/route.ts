import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const announcements = await db.announcement.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      authorId: a.authorId,
      authorName: a.author.name,
      title: a.title,
      body: a.body,
      audience: a.audience,
      createdAt: a.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()
  const ann = await db.announcement.create({
    data: {
      authorId: user.id,
      title: body.title,
      body: body.body,
      audience: body.audience ?? 'ALL',
    },
  })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'ANNOUNCEMENT_CREATE',
      entity: 'Announcement',
      entityId: ann.id,
      details: `Created announcement "${body.title}"`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })
  await db.notification.create({
    data: {
      audience: body.audience ?? 'ALL',
      type: 'ANNOUNCEMENT',
      title: 'New Announcement',
      message: body.title,
      priority: 'NORMAL',
      relatedId: ann.id,
    },
  })
  return NextResponse.json({ announcement: ann })
}
