import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// End a patrol session. Body: { endLat?, endLng?, notes? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const session = await db.patrolSession.findUnique({
    where: { id },
    include: { route: { include: { checkpoints: true } }, verifications: true, guard: { include: { user: true } } },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
  }

  const now = new Date()
  const durationMin = Math.max(1, Math.round((now.getTime() - session.startedAt.getTime()) / 60000))

  const completed = session.verifications.filter((v) => v.status === 'VERIFIED' || v.status === 'FLAGGED').length
  const missed = session.route.checkpoints.length - completed
  const late = session.verifications.filter((v) => v.timingStatus === 'LATE').length
  const flagged = session.verifications.filter((v) => v.suspicious).length

  // Auto-generate a report
  let status = 'COMPLETED'
  if (missed > 0 || flagged > 0) status = 'COMPLETED_WITH_ISSUES'
  if (completed === 0) status = 'INCOMPLETE'

  const report = `Patrol completed on "${session.route.name}" by ${session.guard.user.name}. ` +
    `Duration: ${durationMin} min. Checkpoints completed: ${completed}/${session.route.checkpoints.length}. ` +
    `Late: ${late}. Missed: ${missed}. ${flagged > 0 ? `${flagged} submission(s) flagged for review. ` : ''}` +
    `Overall status: ${status.replace(/_/g, ' ')}.`

  const updated = await db.patrolSession.update({
    where: { id },
    data: {
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
    },
  })

  await db.guard.update({
    where: { id: session.guardId },
    data: { status: 'ON_DUTY' },
  })

  if (session.scheduleId) {
    await db.patrolSchedule.update({ where: { id: session.scheduleId }, data: { status: 'COMPLETED' } })
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'PATROL_END',
      entity: 'PatrolSession',
      entityId: session.id,
      details: `Ended patrol "${session.route.name}" — ${status}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  await db.notification.create({
    data: {
      audience: 'SUPERVISOR',
      type: 'PATROL_COMPLETE',
      title: 'Patrol Completed',
      message: `${session.guard.user.name} completed ${session.route.name} — ${status.replace(/_/g, ' ')}.`,
      priority: status === 'COMPLETED_WITH_ISSUES' ? 'HIGH' : 'NORMAL',
      relatedId: session.id,
    },
  })

  return NextResponse.json({ session: updated, report, status })
}
