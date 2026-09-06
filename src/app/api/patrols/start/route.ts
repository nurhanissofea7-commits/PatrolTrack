import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Start a patrol session. Body: { scheduleId, routeId, guardId?, startLat?, startLng? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  const routeId = body.routeId
  const scheduleId = body.scheduleId || null
  // If guardId not provided (supervisor starting for a guard), use the schedule's guard
  let guardId = body.guardId
  if (!guardId && scheduleId) {
    const sched = await db.patrolSchedule.findUnique({ where: { id: scheduleId } })
    guardId = sched?.guardId
  }
  if (!guardId) {
    return NextResponse.json({ error: 'A guard must be assigned.' }, { status: 400 })
  }

  const route = await db.patrolRoute.findUnique({
    where: { id: routeId },
    include: { checkpoints: { orderBy: { sequence: 'asc' } } },
  })
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  // Prevent duplicate active sessions for the same guard
  const existing = await db.patrolSession.findFirst({
    where: { guardId, status: 'ACTIVE' },
  })
  if (existing) {
    return NextResponse.json({ error: 'Guard already has an active patrol session.', sessionId: existing.id }, { status: 409 })
  }

  const session = await db.patrolSession.create({
    data: {
      scheduleId,
      routeId,
      guardId,
      status: 'ACTIVE',
      startedAt: new Date(),
      startLat: body.startLat ?? null,
      startLng: body.startLng ?? null,
      totalCheckpoints: route.checkpoints.length,
      completedCount: 0,
      missedCount: 0,
      lateCount: 0,
    },
  })

  await db.guard.update({
    where: { id: guardId },
    data: { status: 'ON_PATROL', isOnline: true },
  })

  if (scheduleId) {
    await db.patrolSchedule.update({ where: { id: scheduleId }, data: { status: 'IN_PROGRESS' } })
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'PATROL_START',
      entity: 'PatrolSession',
      entityId: session.id,
      details: `Started patrol on route "${route.name}"`,
      ip: req.headers.get('x-forwarded-for') || undefined,
      deviceInfo: req.headers.get('user-agent') || undefined,
    },
  })

  await db.notification.create({
    data: {
      audience: 'SUPERVISOR',
      type: 'PATROL_STARTING',
      title: 'Patrol Started',
      message: `${user.name} started patrol on ${route.name}.`,
      priority: 'NORMAL',
      relatedId: session.id,
    },
  })

  return NextResponse.json({
    session: {
      id: session.id,
      routeId,
      routeName: route.name,
      guardId,
      startedAt: session.startedAt,
      totalCheckpoints: session.totalCheckpoints,
      checkpoints: route.checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        radiusM: c.radiusM,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin,
      })),
    },
  })
}
