import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const schedules = await db.patrolSchedule.findAll()
  const result = []
  for (const s of schedules) {
    const route = await db.patrolRoute.findById(s.routeId)
    const checkpoints = route ? await db.checkpoint.findMany({ routeId: route.id }) : []
    checkpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    let guard = null
    if (s.guardId) {
      guard = await db.guard.findById(s.guardId)
    }
    const guardUser = guard ? await db.user.findById(guard.userId) : null
    const sessions = await db.patrolSession.findMany({ scheduleId: s.id })
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    result.push({
      id: s.id,
      name: s.name,
      routeId: s.routeId,
      routeName: route?.name || 'Unknown',
      guardId: s.guardId || null,
      guardName: guardUser?.name || null,
      guardColor: guardUser?.avatarColor || null,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      frequency: s.frequency || 'ONE_TIME',
      priority: s.priority || 'NORMAL',
      instructions: s.instructions || null,
      status: s.status || 'SCHEDULED',
      checkpointCount: checkpoints.length,
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin || 15,
      })),
      lastSessionId: sessions[0]?.id ?? null,
    })
  }
  result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  return NextResponse.json({ schedules: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()
  const schedule = await db.patrolSchedule.create({
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
  })
  await db.auditLog.create({
    userId: user.id,
    action: 'SCHEDULE_CREATE',
    entity: 'PatrolSchedule',
    entityId: schedule.id,
    details: `Created schedule "${schedule.name}"`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })
  return NextResponse.json({ schedule })
}
