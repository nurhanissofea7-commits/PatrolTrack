import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// End a patrol session.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const session = await db.patrolSession.findById(id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
  }

  const route = await db.patrolRoute.findById(session.routeId)
  const checkpoints = route ? await db.checkpoint.findMany({ routeId: route.id }) : []
  const verifications = await db.checkpointVerification.findMany({ sessionId: id })
  const guard = await db.guard.findById(session.guardId)
  const guardUser = guard ? await db.user.findById(guard.userId) : null

  const now = new Date()
  const durationMin = Math.max(1, Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 60000))

  const completed = verifications.filter((v) => v.status === 'VERIFIED' || v.status === 'FLAGGED').length
  const missed = checkpoints.length - completed
  const late = verifications.filter((v) => v.timingStatus === 'LATE').length
  const flagged = verifications.filter((v) => v.suspicious).length

  let status = 'COMPLETED'
  if (missed > 0 || flagged > 0) status = 'COMPLETED_WITH_ISSUES'
  if (completed === 0) status = 'INCOMPLETE'

  const report = `Patrol completed on "${route?.name || 'Unknown'}" by ${guardUser?.name || 'Unknown'}. ` +
    `Duration: ${durationMin} min. Checkpoints completed: ${completed}/${checkpoints.length}. ` +
    `Late: ${late}. Missed: ${missed}. ${flagged > 0 ? `${flagged} submission(s) flagged for review. ` : ''}` +
    `Overall status: ${status.replace(/_/g, ' ')}.`

  await db.patrolSession.update(id, {
    status,
    endedAt: now,
    endLat: body.endLat ?? null,
    endLng: body.endLng ?? null,
    durationMin,
    completedCount: completed,
    missedCount: missed,
    lateCount: late,
    suspiciousFlags: flagged,
    notes: body.notes ?? null,
    report,
  })

  await db.guard.update(session.guardId, { status: 'ON_DUTY' })

  if (session.scheduleId) {
    await db.patrolSchedule.update(session.scheduleId, { status: 'COMPLETED' })
  }

  await db.auditLog.create({
    userId: user.id,
    action: 'PATROL_END',
    entity: 'PatrolSession',
    entityId: id,
    details: `Ended patrol "${route?.name || 'Unknown'}" — ${status}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })

  await db.notification.create({
    audience: 'SUPERVISOR',
    type: 'PATROL_COMPLETE',
    title: 'Patrol Completed',
    message: `${guardUser?.name || 'Unknown'} completed ${route?.name || 'patrol'} — ${status.replace(/_/g, ' ')}.`,
    priority: status === 'COMPLETED_WITH_ISSUES' ? 'HIGH' : 'NORMAL',
    relatedId: id,
    read: false,
  })

  return NextResponse.json({ report, status })
}
