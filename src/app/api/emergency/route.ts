import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// POST /api/emergency — activate SOS
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  let guardId = body.guardId ?? user.guardId ?? null
  if (!guardId) {
    const anyGuard = await db.guard.findAll()
    guardId = anyGuard[0]?.id ?? null
  }
  if (!guardId) {
    return NextResponse.json({ error: 'No guard available to trigger SOS.' }, { status: 400 })
  }

  const guard = await db.guard.findById(guardId)
  if (!guard) return NextResponse.json({ error: 'Guard not found.' }, { status: 404 })

  const guardUser = await db.user.findById(guard.userId)
  if (!guardUser) return NextResponse.json({ error: 'Guard user not found.' }, { status: 404 })

  const alert = await db.emergencyAlert.create({
    guardId,
    guardUserId: guard.userId,
    lat: body.lat,
    lng: body.lng,
    accuracy: body.accuracy ?? 0,
    locationLabel: body.locationLabel ?? null,
    status: 'ACTIVE',
    message: body.message ?? `SOS activated by ${guardUser.name}`,
  })

  await db.guard.update(guardId, { status: 'EMERGENCY', currentLat: body.lat, currentLng: body.lng, lastLocationAt: new Date() })

  await db.auditLog.create({
    userId: user.id,
    action: 'SOS_ACTIVATED',
    entity: 'EmergencyAlert',
    entityId: alert.id,
    details: `SOS activated for ${guardUser.name} at ${body.locationLabel ?? 'unknown location'}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
    deviceInfo: req.headers.get('user-agent') || undefined,
  })

  await db.notification.create({
    audience: 'SUPERVISOR',
    type: 'SOS',
    title: 'EMERGENCY ALERT — SOS Activated',
    message: `${guardUser.name} activated SOS. Location: ${body.locationLabel ?? 'coordinates'}.`,
    priority: 'CRITICAL',
    relatedId: alert.id,
    read: false,
  })

  return NextResponse.json({ alert, guardName: guardUser.name })
}

// GET active emergency alerts
export async function GET() {
  const alerts = await db.emergencyAlert.findAll()
  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const result = []
  for (const a of alerts.slice(0, 20)) {
    const guard = await db.guard.findById(a.guardId)
    const guardUser = guard ? await db.user.findById(guard.userId) : null
    result.push({
      id: a.id,
      guardId: a.guardId,
      guardName: guardUser?.name || 'Unknown',
      lat: a.lat,
      lng: a.lng,
      accuracy: a.accuracy,
      locationLabel: a.locationLabel,
      status: a.status,
      message: a.message,
      acknowledgedAt: a.acknowledgedAt ?? null,
      resolvedAt: a.resolvedAt ?? null,
      createdAt: a.createdAt,
    })
  }
  return NextResponse.json({ alerts: result })
}
