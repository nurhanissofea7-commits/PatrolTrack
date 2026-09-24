import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// Start a patrol session.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  const routeId = body.routeId
  const scheduleId = body.scheduleId || null
  let guardId = body.guardId
  if (!guardId && scheduleId) {
    const sched = await db.patrolSchedule.findById(scheduleId)
    guardId = sched?.guardId
  }
  if (!guardId) {
    return NextResponse.json({ error: 'A guard must be assigned.' }, { status: 400 })
  }

  const route = await db.patrolRoute.findById(routeId)
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  const checkpoints = await db.checkpoint.findMany({ routeId })
  checkpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  // Prevent duplicate active sessions
  const existing = await db.patrolSession.findOne('guardId', guardId)
  if (existing && existing.status === 'ACTIVE') {
    return NextResponse.json({ error: 'Guard already has an active patrol session.', sessionId: existing.id }, { status: 409 })
  }

  const session = await db.patrolSession.create({
    scheduleId,
    routeId,
    guardId,
    status: 'ACTIVE',
    startedAt: new Date(),
    startLat: body.startLat ?? null,
    startLng: body.startLng ?? null,
    totalCheckpoints: checkpoints.length,
    completedCount: 0,
    missedCount: 0,
    lateCount: 0,
  })

  await db.guard.update(guardId, { status: 'ON_PATROL', isOnline: true })
  if (scheduleId) {
    await db.patrolSchedule.update(scheduleId, { status: 'IN_PROGRESS' })
  }

  await db.auditLog.create({
    userId: user.id,
    action: 'PATROL_START',
    entity: 'PatrolSession',
    entityId: session.id,
    details: `Started patrol on route "${route.name}"`,
    ip: req.headers.get('x-forwarded-for') || undefined,
    deviceInfo: req.headers.get('user-agent') || undefined,
  })

  await db.notification.create({
    audience: 'SUPERVISOR',
    type: 'PATROL_STARTING',
    title: 'Patrol Started',
    message: `${user.name} started patrol on ${route.name}.`,
    priority: 'NORMAL',
    relatedId: session.id,
    read: false,
  })

  return NextResponse.json({
    session: {
      id: session.id,
      routeId,
      routeName: route.name,
      guardId,
      startedAt: session.startedAt,
      totalCheckpoints: checkpoints.length,
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        radiusM: c.radiusM || 20,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin || 15,
      })),
    },
  })
}
