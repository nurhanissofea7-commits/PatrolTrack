import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Analytics endpoint — aggregates several metrics for the supervisor analytics view
export async function GET() {
  const sessions = await db.patrolSession.findMany({ include: { route: true, guard: { include: { user: true } } } })
  const verifications = await db.checkpointVerification.findMany()
  const incidents = await db.incident.findMany()

  // Patrol completion rate
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length
  const issuesSessions = sessions.filter((s) => s.status === 'COMPLETED_WITH_ISSUES').length
  const incompleteSessions = sessions.filter((s) => s.status === 'INCOMPLETE').length
  const completionRate = sessions.length ? Math.round(((completedSessions + issuesSessions) / sessions.length) * 100) : 0

  // Verification outcomes
  const verified = verifications.filter((v) => v.status === 'VERIFIED').length
  const rejected = verifications.filter((v) => v.status === 'REJECTED').length
  const flagged = verifications.filter((v) => v.status === 'FLAGGED').length
  const missed = verifications.filter((v) => v.status === 'MISSED').length
  const late = verifications.filter((v) => v.timingStatus === 'LATE').length

  // Average duration
  const durations = sessions.filter((s) => s.durationMin).map((s) => s.durationMin!)
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  // Per-guard performance
  const guardPerf = new Map<string, { name: string; color: string; patrols: number; completed: number; checkpoints: number; incidents: number }>()
  for (const s of sessions) {
    const key = s.guardId
    const existing = guardPerf.get(key) ?? { name: s.guard.user.name, color: s.guard.user.avatarColor, patrols: 0, completed: 0, checkpoints: 0, incidents: 0 }
    existing.patrols++
    if (s.status === 'COMPLETED') existing.completed++
    existing.checkpoints += s.completedCount
    guardPerf.set(key, existing)
  }
  // incidents per guard
  for (const inc of incidents) {
    if (inc.guardId && guardPerf.has(inc.guardId)) {
      guardPerf.get(inc.guardId)!.incidents++
    }
  }

  // Daily patrol counts (last 7 days)
  const daily: { date: string; patrols: number; incidents: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const dayPatrols = sessions.filter((s) => s.startedAt >= d && s.startedAt < next).length
    const dayIncidents = incidents.filter((s) => s.occurredAt >= d && s.occurredAt < next).length
    daily.push({ date: d.toISOString().slice(0, 10), patrols: dayPatrols, incidents: dayIncidents })
  }

  // Incident type breakdown
  const incidentTypes: Record<string, number> = {}
  for (const inc of incidents) {
    incidentTypes[inc.type] = (incidentTypes[inc.type] ?? 0) + 1
  }

  return NextResponse.json({
    summary: {
      completionRate,
      verificationSuccessRate: verifications.length ? Math.round((verified / verifications.length) * 100) : 0,
      missedRate: verifications.length ? Math.round((missed / verifications.length) * 100) : 0,
      lateRate: verifications.length ? Math.round((late / verifications.length) * 100) : 0,
      avgDurationMin: avgDuration,
      incidentCount: incidents.length,
      complianceRate: completionRate,
    },
    sessions: { completed: completedSessions, withIssues: issuesSessions, incomplete: incompleteSessions },
    verifications: { verified, rejected, flagged, missed, late, total: verifications.length },
    guardPerformance: Array.from(guardPerf.values()),
    daily,
    incidentTypes,
  })
}
