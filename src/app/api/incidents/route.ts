import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const guardId = searchParams.get('guardId')

  const incidents = await db.incident.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(guardId ? { guardId } : {}),
    },
    include: { guard: { include: { user: true } }, session: { include: { route: true } } },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({
    incidents: incidents.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      severity: i.severity,
      status: i.status,
      lat: i.lat,
      lng: i.lng,
      locationLabel: i.locationLabel,
      photoUrls: i.photoUrls ? JSON.parse(i.photoUrls) : [],
      occurredAt: i.occurredAt,
      createdAt: i.createdAt,
      guard: i.guard ? { id: i.guard.id, name: i.guard.user.name, color: i.guard.user.avatarColor } : null,
      session: i.session ? { id: i.session.id, routeName: i.session.route.name } : null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  const incident = await db.incident.create({
    data: {
      sessionId: body.sessionId || null,
      guardId: body.guardId || user.guardId || null,
      reportedById: user.id,
      type: body.type,
      description: body.description,
      severity: body.severity ?? 'LOW',
      status: 'OPEN',
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      locationLabel: body.locationLabel ?? null,
      photoUrls: JSON.stringify(body.photoUrls ?? []),
      occurredAt: new Date(),
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'INCIDENT_SUBMIT',
      entity: 'Incident',
      entityId: incident.id,
      details: `Reported ${body.type} incident: ${body.description?.slice(0, 80)}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  await db.notification.create({
    data: {
      audience: 'SUPERVISOR',
      type: 'INCIDENT',
      title: 'Incident Report Submitted',
      message: `${user.name} reported a ${body.severity?.toLowerCase()} ${body.type.toLowerCase()} incident.`,
      priority: body.severity === 'CRITICAL' || body.severity === 'HIGH' ? 'HIGH' : 'NORMAL',
      relatedId: incident.id,
    },
  })

  return NextResponse.json({ incident })
}
