import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET() {
  const routes = await db.patrolRoute.findAll()
  const result = []
  for (const r of routes) {
    const location = r.locationId ? await db.location.findById(r.locationId) : null
    const checkpoints = await db.checkpoint.findMany({ routeId: r.id })
    checkpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    const schedules = await db.patrolSchedule.findMany({ routeId: r.id })
    const sessions = await db.patrolSession.findMany({ routeId: r.id })
    result.push({
      id: r.id,
      name: r.name,
      location: location?.name ?? null,
      startLat: r.startLat,
      startLng: r.startLng,
      estimatedDurationMin: r.estimatedDurationMin || 60,
      estimatedDistanceM: r.estimatedDistanceM || 500,
      status: r.status || 'ACTIVE',
      description: r.description || null,
      checkpointCount: checkpoints.length,
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        radiusM: c.radiusM || 20,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin || 15,
        description: c.description || null,
      })),
      scheduleCount: schedules.length,
      sessionCount: sessions.length,
    })
  }
  result.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ routes: result })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const route = await db.patrolRoute.create({
    name: body.name,
    locationId: body.locationId || null,
    startLat: body.startLat ?? 3.139,
    startLng: body.startLng ?? 101.6869,
    estimatedDurationMin: body.estimatedDurationMin ?? 60,
    estimatedDistanceM: body.estimatedDistanceM ?? 500,
    description: body.description ?? null,
    status: 'ACTIVE',
  })
  return NextResponse.json({ route })
}
