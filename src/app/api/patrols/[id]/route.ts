import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await db.patrolSession.findById(id)
  if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const route = await db.patrolRoute.findById(s.routeId)
  const checkpoints = route ? await db.checkpoint.findMany({ routeId: route.id }) : []
  checkpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const guard = await db.guard.findById(s.guardId)
  const guardUser = guard ? await db.user.findById(guard.userId) : null
  const schedule = s.scheduleId ? await db.patrolSchedule.findById(s.scheduleId) : null
  const verifications = await db.checkpointVerification.findMany({ sessionId: s.id })
  verifications.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
  const incidents = await db.incident.findMany({ sessionId: s.id })

  return NextResponse.json({
    session: {
      id: s.id,
      scheduleId: s.scheduleId || null,
      scheduleName: schedule?.name ?? null,
      routeId: s.routeId,
      routeName: route?.name || 'Unknown',
      guardId: s.guardId,
      guardName: guardUser?.name || 'Unknown',
      guardColor: guardUser?.avatarColor || 'emerald',
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
      notes: s.notes || null,
      checkpoints: checkpoints.map((c) => {
        const ver = verifications.find((v) => v.checkpointId === c.id)
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          sequence: c.sequence,
          expectedWindowMin: c.expectedWindowMin || 15,
          verification: ver
            ? {
                id: ver.id,
                photoUrl: ver.photoUrl || null,
                capturedAt: ver.capturedAt,
                serverTimestamp: ver.serverTimestamp,
                lat: ver.lat,
                lng: ver.lng,
                gpsAccuracy: ver.gpsAccuracy || 0,
                distanceToCheckpoint: ver.distanceToCheckpoint || 0,
                withinGeofence: ver.withinGeofence ?? false,
                checklist: ver.checklist || '[]',
                notes: ver.notes || null,
                status: ver.status,
                timingStatus: ver.timingStatus || 'ON_TIME',
                suspicious: ver.suspicious ?? false,
                suspiciousFlags: ver.suspiciousFlags || null,
                rejectionReason: ver.rejectionReason || null,
              }
            : null,
        }
      }),
      incidents: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        description: i.description,
        occurredAt: i.occurredAt,
        locationLabel: i.locationLabel || null,
        photoUrls: i.photoUrls || '[]',
      })),
    },
  })
}
