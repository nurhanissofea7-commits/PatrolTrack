import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const logs = await db.auditLog.findMany({
    where: action ? { action } : undefined,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user?.name ?? 'System',
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      ip: l.ip,
      deviceInfo: l.deviceInfo,
      createdAt: l.createdAt,
    })),
  })
}
