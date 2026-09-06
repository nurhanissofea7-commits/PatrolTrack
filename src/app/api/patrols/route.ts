import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guardId = searchParams.get('guardId')
  const status = searchParams.get('status')

  const sessions = await db.patrolSession.findMany({
    where: {
      ...(guardId ? { guardId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      route: { include: { checkpoints: { orderBy: { sequence: 'asc' } } } },
      guard: { include: { user: true } },
      schedule: true,
      verifications: { orderBy: { sequenceOrder: 'asc' } },
      incidents: true,
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    sessions: sessions.map((s) => ({
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
      startLat: s.startLat,
      startLng: s.startLng,
      endLat: s.endLat,
      endLng: s.endLng,
      completedCount: s.completedCount,
      missedCount: s.missedCount,
      lateCount: s.lateCount,
      totalCheckpoints: s.totalCheckpoints,
      suspiciousFlags: s.suspiciousFlags,
      report: s.report,
      notes: s.notes,
      checkpoints: s.route.checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin,
      })),
      verifications: s.verifications.map((v) => ({
        id: v.id,
        checkpointId: v.checkpointId,
        sequenceOrder: v.sequenceOrder,
        photoUrl: v.photoUrl,
        capturedAt: v.capturedAt,
        serverTimestamp: v.serverTimestamp,
        lat: v.lat,
        lng: v.lng,
        gpsAccuracy: v.gpsAccuracy,
        distanceToCheckpoint: v.distanceToCheckpoint,
        withinGeofence: v.withinGeofence,
        checklist: v.checklist,
        notes: v.notes,
        deviceInfo: v.deviceInfo,
        status: v.status,
        rejectionReason: v.rejectionReason,
        timingStatus: v.timingStatus,
        isOnTime: v.isOnTime,
        suspicious: v.suspicious,
        suspiciousFlags: v.suspiciousFlags,
      })),
      incidents: s.incidents.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        description: i.description,
      })),
    })),
  })
}
