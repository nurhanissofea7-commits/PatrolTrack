import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  let logs = await db.auditLog.findAll()
  if (action) logs = logs.filter((l) => l.action === action)
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  logs = logs.slice(0, 100)

  const result = []
  for (const l of logs) {
    let userName = 'System'
    if (l.userId) {
      const u = await db.user.findById(l.userId)
      if (u) userName = u.name
    }
    result.push({
      id: l.id,
      userId: l.userId ?? null,
      userName,
      action: l.action,
      entity: l.entity ?? null,
      entityId: l.entityId ?? null,
      details: l.details ?? null,
      ip: l.ip ?? null,
      deviceInfo: l.deviceInfo ?? null,
      createdAt: l.createdAt,
    })
  }
  return NextResponse.json({ logs: result })
}
