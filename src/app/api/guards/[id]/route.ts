import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await db.guard.findById(id)
  if (!guard) return NextResponse.json({ error: 'Guard not found' }, { status: 404 })

  const user = await db.user.findById(guard.userId)
  let supervisor = null
  if (guard.supervisorId) {
    const sup = await db.supervisor.findById(guard.supervisorId)
    if (sup) {
      const supUser = await db.user.findById(sup.userId)
      supervisor = { id: sup.id, name: supUser?.name || 'Unknown' }
    }
  }

  const sessions = await db.patrolSession.findMany({ guardId: id })
  // Sort by startedAt desc
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  const incidents = await db.incident.findMany({ guardId: id })
  incidents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Enrich sessions with route name
  const enrichedSessions = []
  for (const s of sessions.slice(0, 20)) {
    const route = await db.patrolRoute.findById(s.routeId)
    const verifications = await db.checkpointVerification.findMany({ sessionId: s.id })
    const sessionIncidents = await db.incident.findMany({ sessionId: s.id })
    enrichedSessions.push({
      id: s.id,
      routeName: route?.name || 'Unknown',
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt || null,
      durationMin: s.durationMin ?? null,
      completedCount: s.completedCount || 0,
      missedCount: s.missedCount || 0,
      lateCount: s.lateCount || 0,
      totalCheckpoints: s.totalCheckpoints || 0,
      suspiciousFlags: s.suspiciousFlags || 0,
      report: s.report || null,
      scheduleName: null,
    })
  }

  const enrichedIncidents = incidents.slice(0, 10).map((i) => ({
    id: i.id,
    type: i.type,
    description: i.description,
    severity: i.severity,
    status: i.status,
    occurredAt: i.occurredAt,
    locationLabel: i.locationLabel || null,
  }))

  return NextResponse.json({
    guard: {
      id: guard.id,
      employeeId: guard.employeeId,
      name: user?.name || 'Unknown',
      email: user?.email || '',
      phone: user?.phone || null,
      avatarColor: user?.avatarColor || 'emerald',
      rank: guard.rank,
      shift: guard.shift,
      status: guard.status,
      isOnline: guard.isOnline,
      rating: guard.rating || 5,
      supervisor,
      currentLat: guard.currentLat ?? null,
      currentLng: guard.currentLng ?? null,
      currentAccuracy: guard.currentAccuracy ?? null,
      lastLocationAt: guard.lastLocationAt || null,
      batteryLevel: guard.batteryLevel ?? null,
      deviceInfo: guard.deviceInfo ?? null,
      licenseNumber: guard.licenseNumber ?? null,
      hireDate: guard.hireDate || new Date(),
    },
    sessions: enrichedSessions,
    incidents: enrichedIncidents,
    patrolStats: {
      total: sessions.length,
      completed: sessions.filter((s) => s.status === 'COMPLETED').length,
      withIssues: sessions.filter((s) => s.status === 'COMPLETED_WITH_ISSUES').length,
      active: sessions.filter((s) => s.status === 'ACTIVE').length,
      avgRating: guard.rating || 5,
    },
  })
}
