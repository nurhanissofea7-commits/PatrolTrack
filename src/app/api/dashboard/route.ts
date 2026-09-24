import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

// Supervisor dashboard overview stats
export async function GET() {
  const guards = await db.guard.findAll()
  const onDuty = guards.filter((g) => g.isOnline && g.status !== 'OFF_DUTY').length
  const onPatrol = guards.filter((g) => g.status === 'ON_PATROL').length

  const activePatrols = await db.patrolSession.count({ status: 'ACTIVE' })
  const completedSessions = await db.patrolSession.findMany({ status: { in: ['COMPLETED', 'COMPLETED_WITH_ISSUES'] } })
  const completedPatrols = completedSessions.length

  const verifications = await db.checkpointVerification.findAll()
  const missed = verifications.filter((v) => v.status === 'MISSED').length
  const late = verifications.filter((v) => v.timingStatus === 'LATE').length
  const flagged = verifications.filter((v) => v.status === 'FLAGGED' || v.suspicious).length

  const incidents = await db.incident.findAll()
  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'INVESTIGATING').length
  const activeEmergencies = await db.emergencyAlert.count({ status: 'ACTIVE' })
  const scheduledToday = await db.patrolSchedule.count({ status: 'SCHEDULED' })

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
