import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await db.guard.findUnique({
    where: { id },
    include: {
      user: true,
      supervisor: { include: { user: true } },
    },
  })
  if (!guard) return NextResponse.json({ error: 'Guard not found' }, { status: 404 })

  const sessions = await db.patrolSession.findMany({
    where: { guardId: id },
    include: { route: true, schedule: true, verifications: true, incidents: true },
    orderBy: { startedAt: 'desc' },
    take: 20,
  })

  const incidents = await db.incident.findMany({
    where: { guardId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({
    guard: {
      id: guard.id,
      employeeId: guard.employeeId,
      name: guard.user.name,
      email: guard.user.email,
      phone: guard.user.phone,
      avatarColor: guard.user.avatarColor,
      rank: guard.rank,
      shift: guard.shift,
      status: guard.status,
      isOnline: guard.isOnline,
      rating: guard.rating,
      supervisor: guard.supervisor ? { id: guard.supervisor.id, name: guard.supervisor.user.name } : null,
      currentLat: guard.currentLat,
      currentLng: guard.currentLng,
      currentAccuracy: guard.currentAccuracy,
      lastLocationAt: guard.lastLocationAt,
      batteryLevel: guard.batteryLevel,
      deviceInfo: guard.deviceInfo,
      licenseNumber: guard.licenseNumber,
      hireDate: guard.hireDate,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      routeName: s.route.name,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMin: s.durationMin,
      completedCount: s.completedCount,
      missedCount: s.missedCount,
      lateCount: s.lateCount,
      totalCheckpoints: s.totalCheckpoints,
      suspiciousFlags: s.suspiciousFlags,
      report: s.report,
      scheduleName: s.schedule?.name,
    })),
    incidents: incidents.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      severity: i.severity,
      status: i.status,
      occurredAt: i.occurredAt,
      locationLabel: i.locationLabel,
    })),
    patrolStats: {
      total: sessions.length,
      completed: sessions.filter((s) => s.status === 'COMPLETED').length,
      withIssues: sessions.filter((s) => s.status === 'COMPLETED_WITH_ISSUES').length,
      active: sessions.filter((s) => s.status === 'ACTIVE').length,
      avgRating: guard.rating,
    },
  })
}
