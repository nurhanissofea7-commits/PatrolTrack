import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const routeId = searchParams.get('routeId')
  const checkpoints = routeId ? await db.checkpoint.findMany({ routeId }) : await db.checkpoint.findAll()
  const result = []
  for (const c of checkpoints) {
    const route = await db.patrolRoute.findById(c.routeId)
    const location = c.locationId ? await db.location.findById(c.locationId) : null
    result.push({
      id: c.id,
      code: c.code,
      name: c.name,
      routeId: c.routeId,
      routeName: route?.name || 'Unknown',
      location: location?.name ?? null,
      lat: c.lat,
      lng: c.lng,
      radiusM: c.radiusM || 20,
      sequence: c.sequence,
      expectedWindowMin: c.expectedWindowMin || 15,
      description: c.description || null,
    })
  }
  result.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  return NextResponse.json({ checkpoints: result })
}

// POST - Create a new checkpoint
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const body = await req.json()
  const existing = await db.checkpoint.findMany({ routeId: body.routeId })
  const maxSeq = Math.max(...existing.map((c: any) => c.sequence || 0), 0)
  const checkpoint = await db.checkpoint.create({
    code: body.code,
    name: body.name,
    routeId: body.routeId,
    lat: body.lat || 3.139,
    lng: body.lng || 101.6869,
    radiusM: body.radiusM || 20,
    sequence: body.sequence || maxSeq + 1,
    expectedWindowMin: body.expectedWindowMin || 15,
    description: body.description || null,
  })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'CHECKPOINT_CREATE',
      entity: 'Checkpoint',
      entityId: checkpoint.id,
      details: `Created checkpoint ${body.code} (${body.name})`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  } as any)
  return NextResponse.json({ checkpoint })
}
