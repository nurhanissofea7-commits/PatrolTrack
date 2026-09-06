import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/emergency — activate SOS
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  // Resolve the guard: prefer the body.guardId (supervisor simulating), else the caller's own guardId
  let guardId = body.guardId ?? user.guardId ?? null
  if (!guardId) {
    // Fallback: pick the first guard (simulation mode)
    const anyGuard = await db.guard.findFirst({})
    guardId = anyGuard?.id ?? null
  }
  if (!guardId) {
    return NextResponse.json({ error: 'No guard available to trigger SOS.' }, { status: 400 })
  }

  const guard = await db.guard.findUnique({ where: { id: guardId }, include: { user: true } })
  if (!guard) return NextResponse.json({ error: 'Guard not found.' }, { status: 404 })

  const alert = await db.emergencyAlert.create({
    data: {
      guardId,
      guardUserId: guard.userId,
      lat: body.lat,
      lng: body.lng,
      accuracy: body.accuracy ?? 0,
      locationLabel: body.locationLabel ?? null,
      status: 'ACTIVE',
      message: body.message ?? `SOS activated by ${guard.user.name}`,
    },
  })

  await db.guard.update({
    where: { id: guardId },
    data: { status: 'EMERGENCY', currentLat: body.lat, currentLng: body.lng, lastLocationAt: new Date() },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'SOS_ACTIVATED',
      entity: 'EmergencyAlert',
      entityId: alert.id,
      details: `SOS activated for ${guard.user.name} at ${body.locationLabel ?? 'unknown location'}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
      deviceInfo: req.headers.get('user-agent') || undefined,
    },
  })

  await db.notification.create({
    data: {
      audience: 'SUPERVISOR',
      type: 'SOS',
      title: 'EMERGENCY ALERT — SOS Activated',
      message: `${guard.user.name} activated SOS. Location: ${body.locationLabel ?? 'coordinates'}.`,
      priority: 'CRITICAL',
      relatedId: alert.id,
    },
  })

  return NextResponse.json({ alert, guardName: guard.user.name })
}

// GET active emergency alerts
export async function GET() {
  const alerts = await db.emergencyAlert.findMany({
    include: { guard: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      guardId: a.guardId,
      guardName: a.guard.user.name,
      lat: a.lat,
      lng: a.lng,
      accuracy: a.accuracy,
      locationLabel: a.locationLabel,
      status: a.status,
      message: a.message,
      acknowledgedAt: a.acknowledgedAt,
      resolvedAt: a.resolvedAt,
      createdAt: a.createdAt,
    })),
  })
}
