import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await db.patrolSession.findUnique({
    where: { id },
    include: {
      route: { include: { checkpoints: { orderBy: { sequence: 'asc' } } } },
      guard: { include: { user: true } },
      schedule: true,
      verifications: { orderBy: { sequenceOrder: 'asc' } },
      incidents: true,
    },
  })
  if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json({
    session: {
      id: s.id,
      scheduleId: s.scheduleId,
      scheduleName: s.schedule?.name ?? null,
      routeId: s.routeId,
      routeName: s.route.name,
      guardId: s.guardId,
      guardName: s.guard.user.name,
      guardColor: s.guard.user.avatarColor,
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
      notes: s.notes,
      checkpoints: s.route.checkpoints.map((c) => {
        const ver = s.verifications.find((v) => v.checkpointId === c.id)
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          sequence: c.sequence,
          expectedWindowMin: c.expectedWindowMin,
          verification: ver
            ? {
                id: ver.id,
                photoUrl: ver.photoUrl,
                capturedAt: ver.capturedAt,
                serverTimestamp: ver.serverTimestamp,
                lat: ver.lat,
                lng: ver.lng,
                gpsAccuracy: ver.gpsAccuracy,
                distanceToCheckpoint: ver.distanceToCheckpoint,
                withinGeofence: ver.withinGeofence,
                checklist: ver.checklist,
                notes: ver.notes,
                status: ver.status,
                timingStatus: ver.timingStatus,
                suspicious: ver.suspicious,
                suspiciousFlags: ver.suspiciousFlags,
                rejectionReason: ver.rejectionReason,
              }
            : null,
        }
      }),
      incidents: s.incidents.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        description: i.description,
        occurredAt: i.occurredAt,
        locationLabel: i.locationLabel,
        photoUrls: i.photoUrls,
      })),
    },
  })
}
