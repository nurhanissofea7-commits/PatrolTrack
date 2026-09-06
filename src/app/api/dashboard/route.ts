import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Supervisor dashboard overview stats
export async function GET() {
  const guards = await db.guard.findMany()
  const onDuty = guards.filter((g) => g.isOnline && g.status !== 'OFF_DUTY').length
  const onPatrol = guards.filter((g) => g.status === 'ON_PATROL').length

  const activePatrols = await db.patrolSession.count({ where: { status: 'ACTIVE' } })
  const completedPatrols = await db.patrolSession.count({
    where: { status: { in: ['COMPLETED', 'COMPLETED_WITH_ISSUES'] } },
  })

  const verifications = await db.checkpointVerification.findMany()
  const missed = verifications.filter((v) => v.status === 'MISSED').length
  const late = verifications.filter((v) => v.timingStatus === 'LATE').length
  const flagged = verifications.filter((v) => v.status === 'FLAGGED' || v.suspicious).length

  const openIncidents = await db.incident.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } })
  const activeEmergencies = await db.emergencyAlert.count({ where: { status: 'ACTIVE' } })
  const scheduledToday = await db.patrolSchedule.count({
    where: { status: 'SCHEDULED' },
  })

  const verified = verifications.filter((v) => v.status === 'VERIFIED').length
  const rejected = verifications.filter((v) => v.status === 'REJECTED').length
  const flaggedCount = verifications.filter((v) => v.status === 'FLAGGED').length

  return NextResponse.json({
    guardsOnDuty: onDuty,
    guardsOnPatrol: onPatrol,
    totalGuards: guards.length,
    activePatrols,
    completedPatrols,
    missedCheckpoints: missed,
    lateCheckpoints: late,
    flaggedSubmissions: flagged,
    openIncidents,
    activeEmergencies,
    scheduledToday,
    verification: {
      trueAcceptance: verified,
      trueRejection: rejected,
      falseAcceptance: 0,
      falseRejection: flaggedCount,
      total: verifications.length,
      successRate: verifications.length ? Math.round((verified / verifications.length) * 100) : 0,
    },
  })
}
