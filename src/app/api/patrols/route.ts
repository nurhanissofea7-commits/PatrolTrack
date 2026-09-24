import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guardId = searchParams.get('guardId')
  const status = searchParams.get('status')

  let sessions = await db.patrolSession.findAll()
  if (guardId) sessions = sessions.filter((s) => s.guardId === guardId)
  if (status) sessions = sessions.filter((s) => s.status === status)

  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  sessions = sessions.slice(0, 50)

  const result = []
  for (const s of sessions) {
    const route = await db.patrolRoute.findById(s.routeId)
    const checkpoints = route ? await db.checkpoint.findMany({ routeId: route.id }) : []
    checkpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    const guard = await db.guard.findById(s.guardId)
    const guardUser = guard ? await db.user.findById(guard.userId) : null
    const schedule = s.scheduleId ? await db.patrolSchedule.findById(s.scheduleId) : null
    const verifications = await db.checkpointVerification.findMany({ sessionId: s.id })
    verifications.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
    const incidents = await db.incident.findMany({ sessionId: s.id })

    result.push({
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
      startLat: s.startLat ?? null,
      startLng: s.startLng ?? null,
      endLat: s.endLat ?? null,
      endLng: s.endLng ?? null,
      completedCount: s.completedCount || 0,
      missedCount: s.missedCount || 0,
      lateCount: s.lateCount || 0,
      totalCheckpoints: s.totalCheckpoints || 0,
      suspiciousFlags: s.suspiciousFlags || 0,
      report: s.report || null,
      notes: s.notes || null,
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin || 15,
      })),
      verifications: verifications.map((v) => ({
        id: v.id,
        checkpointId: v.checkpointId,
        sequenceOrder: v.sequenceOrder,
        photoUrl: v.photoUrl || null,
        capturedAt: v.capturedAt,
        serverTimestamp: v.serverTimestamp,
        lat: v.lat,
        lng: v.lng,
        gpsAccuracy: v.gpsAccuracy || 0,
        distanceToCheckpoint: v.distanceToCheckpoint || 0,
        withinGeofence: v.withinGeofence ?? false,
        checklist: v.checklist || '[]',
        notes: v.notes || null,
        deviceInfo: v.deviceInfo || null,
        status: v.status,
        rejectionReason: v.rejectionReason || null,
        timingStatus: v.timingStatus || 'ON_TIME',
        isOnTime: v.isOnTime ?? true,
        suspicious: v.suspicious ?? false,
        suspiciousFlags: v.suspiciousFlags || null,
      })),
      incidents: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        description: i.description,
      })),
    })
  }

  return NextResponse.json({ sessions: result })
}
