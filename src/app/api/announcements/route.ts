import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const announcements = await db.announcement.findAll()
  announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const result = []
  for (const a of announcements.slice(0, 20)) {
    const author = a.authorId ? await db.user.findById(a.authorId) : null
    result.push({
      id: a.id,
      authorId: a.authorId,
      authorName: author?.name || 'Unknown',
      title: a.title,
      body: a.body,
      audience: a.audience || 'ALL',
      createdAt: a.createdAt,
    })
  }
  return NextResponse.json({ announcements: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()
  const ann = await db.announcement.create({
    authorId: user.id,
    title: body.title,
    body: body.body,
    audience: body.audience ?? 'ALL',
  })
  await db.auditLog.create({
    userId: user.id,
    action: 'ANNOUNCEMENT_CREATE',
    entity: 'Announcement',
    entityId: ann.id,
    details: `Created announcement "${body.title}"`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })
  await db.notification.create({
    audience: body.audience ?? 'ALL',
    type: 'ANNOUNCEMENT',
    title: 'New Announcement',
    message: body.title,
    priority: 'NORMAL',
    relatedId: ann.id,
    read: false,
  })
  return NextResponse.json({ announcement: ann })
}
