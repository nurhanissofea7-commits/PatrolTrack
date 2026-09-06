import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const schedules = await db.patrolSchedule.findMany({
    include: {
      route: { include: { checkpoints: { orderBy: { sequence: 'asc' } } } },
      guard: { include: { user: true } },
      sessions: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
    orderBy: { startTime: 'desc' },
  })
  return NextResponse.json({
    schedules: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      routeId: s.routeId,
      routeName: s.route.name,
      guardId: s.guardId,
      guardName: s.guard?.user.name ?? null,
      guardColor: s.guard?.user.avatarColor ?? null,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      frequency: s.frequency,
      priority: s.priority,
      instructions: s.instructions,
      status: s.status,
      checkpointCount: s.route.checkpoints.length,
      checkpoints: s.route.checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin,
      })),
      lastSessionId: s.sessions[0]?.id ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()
  const schedule = await db.patrolSchedule.create({
    data: {
      name: body.name,
      routeId: body.routeId,
      guardId: body.guardId || null,
      date: new Date(body.date),
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      frequency: body.frequency ?? 'ONE_TIME',
      priority: body.priority ?? 'NORMAL',
      instructions: body.instructions ?? null,
      status: 'SCHEDULED',
    },
  })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'SCHEDULE_CREATE',
      entity: 'PatrolSchedule',
      entityId: schedule.id,
      details: `Created schedule "${schedule.name}"`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })
  return NextResponse.json({ schedule })
}
