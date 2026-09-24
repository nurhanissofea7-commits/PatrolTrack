import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const guardId = searchParams.get('guardId')

  let incidents = await db.incident.findAll()
  if (status) incidents = incidents.filter((i) => i.status === status)
  if (guardId) incidents = incidents.filter((i) => i.guardId === guardId)

  incidents.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  incidents = incidents.slice(0, 50)

  const result = []
  for (const i of incidents) {
    let guard = null
    if (i.guardId) {
      const g = await db.guard.findById(i.guardId)
      if (g) {
        const gu = await db.user.findById(g.userId)
        guard = { id: g.id, name: gu?.name || 'Unknown', color: gu?.avatarColor || 'emerald' }
      }
    }
    let session = null
    if (i.sessionId) {
      const s = await db.patrolSession.findById(i.sessionId)
      if (s) {
        const r = await db.patrolRoute.findById(s.routeId)
        session = { id: s.id, routeName: r?.name || 'Unknown' }
      }
    }
    result.push({
      id: i.id,
      type: i.type,
      description: i.description,
      severity: i.severity,
      status: i.status,
      lat: i.lat ?? null,
      lng: i.lng ?? null,
      locationLabel: i.locationLabel ?? null,
      photoUrls: i.photoUrls ? (typeof i.photoUrls === 'string' ? JSON.parse(i.photoUrls) : i.photoUrls) : [],
      occurredAt: i.occurredAt,
      createdAt: i.createdAt,
      guard,
      session,
    })
  }

  return NextResponse.json({ incidents: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  const body = await req.json()

  const incident = await db.incident.create({
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
  })

  await db.auditLog.create({
    userId: user.id,
    action: 'INCIDENT_SUBMIT',
    entity: 'Incident',
    entityId: incident.id,
    details: `Reported ${body.type} incident: ${body.description?.slice(0, 80)}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })

  await db.notification.create({
    audience: 'SUPERVISOR',
    type: 'INCIDENT',
    title: 'Incident Report Submitted',
    message: `${user.name} reported a ${(body.severity || '').toLowerCase()} ${(body.type || '').toLowerCase()} incident.`,
    priority: body.severity === 'CRITICAL' || body.severity === 'HIGH' ? 'HIGH' : 'NORMAL',
    relatedId: incident.id,
    read: false,
  })

  return NextResponse.json({ incident })
}
