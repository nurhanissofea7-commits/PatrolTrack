import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'
import { distanceM } from '@/lib/patrol'

// POST /api/verifications — submit a checkpoint verification
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  const { sessionId, checkpointId, photo, lat, lng, gpsAccuracy, clientTimestamp, checklist, notes, deviceInfo } = body

  if (!sessionId || !checkpointId) {
    return NextResponse.json({ error: 'sessionId and checkpointId are required.' }, { status: 400 })
  }

  const session = await db.patrolSession.findById(sessionId)
  if (!session) return NextResponse.json({ error: 'Patrol session not found.' }, { status: 404 })
  if (session.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Patrol session is not active.' }, { status: 400 })
  }

  const checkpoint = await db.checkpoint.findById(checkpointId)
  if (!checkpoint) return NextResponse.json({ error: 'Checkpoint not found.' }, { status: 404 })

  // Validation 1: Checkpoint belongs to the route
  if (checkpoint.routeId !== session.routeId) {
    return NextResponse.json({ status: 'REJECTED', reason: 'Checkpoint does not belong to the assigned patrol route.', verification: null })
  }

  // Validation 2: Sequence
  const routeCheckpoints = await db.checkpoint.findMany({ routeId: session.routeId })
  routeCheckpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const existingVerifications = await db.checkpointVerification.findMany({ sessionId })
  existingVerifications.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
  const completedSequences = new Set(
    existingVerifications.filter((v) => v.status === 'VERIFIED' || v.status === 'FLAGGED').map((v) => v.sequenceOrder)
  )
  const expectedSequence = routeCheckpoints.find((c) => !completedSequences.has(c.sequence))?.sequence
  const sequenceOk = expectedSequence === undefined || checkpoint.sequence === expectedSequence
  const sequenceSkipped = expectedSequence !== undefined && checkpoint.sequence > expectedSequence

  // Validation 3: No repeated submissions
  const already = existingVerifications.find((v) => v.checkpointId === checkpointId && (v.status === 'VERIFIED' || v.status === 'FLAGGED'))
  if (already) {
    return NextResponse.json({ status: 'REJECTED', reason: 'This checkpoint has already been verified in this patrol.', verification: null })
  }

  // Validation 4: GPS geofence
  const dist = lat && lng ? distanceM(lat, lng, checkpoint.lat, checkpoint.lng) : -1
  const withinGeofence = dist >= 0 && dist <= checkpoint.radiusM

  // Validation 5: GPS accuracy
  const suspiciousAccuracy = gpsAccuracy > 50

  // Validation 6: Server-validated timestamp
  const serverTimestamp = new Date()
  const clientTime = clientTimestamp ? new Date(clientTimestamp) : serverTimestamp
  const skewMs = Math.abs(serverTimestamp.getTime() - clientTime.getTime())
  const clockSkew = skewMs > 5 * 60 * 1000

  // Validation 7: Time window
  const elapsedMin = (serverTimestamp.getTime() - new Date(session.startedAt).getTime()) / 60000
  const expectedMin = checkpoint.expectedWindowMin || 15
  const windowBefore = 5
  let timingStatus = 'ON_TIME'
  if (elapsedMin < expectedMin - windowBefore) timingStatus = 'EARLY'
  else if (elapsedMin > expectedMin + 10) timingStatus = 'LATE'
  else if (elapsedMin > expectedMin + 60) timingStatus = 'MISSED'

  // Validation 8: Required checklist
  const checklistArr = Array.isArray(checklist) ? checklist : []
  const checklistComplete = checklistArr.length > 0 && checklistArr.every((q) => q.a && q.a.trim() !== '')

  // Validation 9: Photo required
  const hasPhoto = !!photo

  // Suspicious flags
  const flags: string[] = []
  if (!withinGeofence) flags.push('OUTSIDE_GEOFENCE')
  if (sequenceSkipped) flags.push('SEQUENCE_SKIPPED')
  if (suspiciousAccuracy) flags.push('POOR_GPS_ACCURACY')
  if (clockSkew) flags.push('CLOCK_SKEW')
  if (timingStatus === 'EARLY') flags.push('EARLY_SUBMISSION')

  // Impossible travel speed
  const lastVer = existingVerifications[existingVerifications.length - 1]
  if (lastVer && lastVer.lat && lastVer.lng && lat && lng) {
    const distMeters = distanceM(lastVer.lat, lastVer.lng, lat, lng)
    const timeSec = (serverTimestamp.getTime() - new Date(lastVer.capturedAt).getTime()) / 1000
    if (timeSec > 0) {
      const speedKmh = (distMeters / timeSec) * 3.6
      if (speedKmh > 80) flags.push('IMPOSSIBLE_SPEED')
    }
  }

  // Critical checklist answers
  const criticalIssues = checklistArr.filter((q) => q.critical && (q.a === 'No' || q.a === 'Abnormal'))
  if (criticalIssues.length > 0) flags.push('SAFETY_ISSUE')

  // Determine status
  let status: 'VERIFIED' | 'REJECTED' | 'FLAGGED' = 'VERIFIED'
  let rejectionReason: string | null = null

  if (!withinGeofence) {
    status = 'REJECTED'
    rejectionReason = `Checkpoint verification failed — you are ${Math.round(dist)}m away. Allowed radius is ${checkpoint.radiusM}m.`
  } else if (!hasPhoto) {
    status = 'REJECTED'
    rejectionReason = 'A live checkpoint photo is required.'
  } else if (!checklistComplete) {
    status = 'REJECTED'
    rejectionReason = 'All safety checklist questions must be answered.'
  } else if (flags.length > 0 && (flags.includes('IMPOSSIBLE_SPEED') || flags.includes('SEQUENCE_SKIPPED') || flags.includes('CLOCK_SKEW'))) {
    status = 'FLAGGED'
  } else if (flags.length > 0) {
    status = 'FLAGGED'
  }

  const photoUrl = hasPhoto
    ? (photo.startsWith('data:') ? photo : (typeof photo === 'string' && photo.length < 50 ? photo : `/api/placeholder/checkpoint/${checkpoint.code}`))
    : null

  const verification = await db.checkpointVerification.create({
    sessionId,
    checkpointId,
    guardId: session.guardId,
    photoUrl,
    capturedAt: clientTime,
    serverTimestamp,
    clientTimestamp: clientTime,
    deviceTimestamp: clientTime,
    lat: lat ?? 0,
    lng: lng ?? 0,
    gpsAccuracy: gpsAccuracy ?? 0,
    distanceToCheckpoint: dist,
    withinGeofence,
    checklist: JSON.stringify(checklistArr),
    notes: notes ?? null,
    deviceInfo: deviceInfo ?? null,
    status,
    rejectionReason,
    sequenceOrder: checkpoint.sequence,
    isOnTime: timingStatus === 'ON_TIME',
    timingStatus,
    suspicious: flags.length > 0,
    suspiciousFlags: flags.length > 0 ? JSON.stringify(flags) : null,
  })

  // Update session progress
  if (status !== 'REJECTED') {
    const allVerifications = await db.checkpointVerification.findMany({ sessionId })
    const valid = allVerifications.filter((v) => v.status === 'VERIFIED' || v.status === 'FLAGGED')
    const completedNow = valid.length
    const lateNow = valid.filter((v) => v.timingStatus === 'LATE').length
    await db.patrolSession.update(sessionId, { completedCount: completedNow, lateCount: lateNow })
  }

  // Audit + notifications
  await db.auditLog.create({
    userId: user.id,
    action: status === 'REJECTED' ? 'CHECKPOINT_REJECTED' : 'CHECKPOINT_VERIFIED',
    entity: 'CheckpointVerification',
    entityId: verification.id,
    details: `${checkpoint.code} (${checkpoint.name}) — ${status}${timingStatus !== 'ON_TIME' ? ` — ${timingStatus}` : ''}${flags.length ? ` — flags: ${flags.join(', ')}` : ''}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
    deviceInfo: deviceInfo ?? undefined,
  })

  if (status === 'FLAGGED' || status === 'REJECTED') {
    await db.notification.create({
      audience: 'SUPERVISOR',
      type: status === 'REJECTED' ? 'INVALID_VERIFICATION' : 'SUSPICIOUS',
      title: status === 'REJECTED' ? 'Checkpoint Verification Rejected' : 'Suspicious Checkpoint Submission',
      message: `Guard — ${checkpoint.code}: ${rejectionReason || flags.join(', ')}.`,
      priority: status === 'REJECTED' ? 'HIGH' : 'NORMAL',
      relatedId: verification.id,
      read: false,
    })
  }

  if (criticalIssues.length > 0) {
    await db.incident.create({
      sessionId,
      guardId: session.guardId,
      reportedById: user.id,
      type: 'HAZARD',
      description: `Auto-flagged at ${checkpoint.code} (${checkpoint.name}): ${criticalIssues.map((q) => q.q).join('; ')}. ${notes ?? ''}`.trim(),
      severity: 'HIGH',
      status: 'OPEN',
      lat: lat ?? checkpoint.lat,
      lng: lng ?? checkpoint.lng,
      locationLabel: checkpoint.name,
      photoUrls: JSON.stringify(photoUrl ? [photoUrl] : []),
      occurredAt: serverTimestamp,
    })
  }

  return NextResponse.json({
    status,
    reason: rejectionReason,
    timingStatus,
    distance: Math.round(dist),
    withinGeofence,
    flags,
    verification: { id: verification.id },
    checkpoint: { code: checkpoint.code, name: checkpoint.name, sequence: checkpoint.sequence },
  })
}
