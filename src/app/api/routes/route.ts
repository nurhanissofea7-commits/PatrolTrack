import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const routes = await db.patrolRoute.findMany({
    include: {
      location: true,
      checkpoints: { orderBy: { sequence: 'asc' } },
      _count: { select: { schedules: true, sessions: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location?.name ?? null,
      startLat: r.startLat,
      startLng: r.startLng,
      estimatedDurationMin: r.estimatedDurationMin,
      estimatedDistanceM: r.estimatedDistanceM,
      status: r.status,
      description: r.description,
      checkpointCount: r.checkpoints.length,
      checkpoints: r.checkpoints.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        radiusM: c.radiusM,
        sequence: c.sequence,
        expectedWindowMin: c.expectedWindowMin,
        description: c.description,
      })),
      scheduleCount: r._count.schedules,
      sessionCount: r._count.sessions,
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const route = await db.patrolRoute.create({
    data: {
      name: body.name,
      locationId: body.locationId || null,
      startLat: body.startLat ?? 3.139,
      startLng: body.startLng ?? 101.6869,
      estimatedDurationMin: body.estimatedDurationMin ?? 60,
      estimatedDistanceM: body.estimatedDistanceM ?? 500,
      description: body.description ?? null,
    },
  })
  return NextResponse.json({ route })
}
