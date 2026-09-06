import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const routeId = searchParams.get('routeId')
  const checkpoints = await db.checkpoint.findMany({
    where: routeId ? { routeId } : undefined,
    include: { route: true, location: true },
    orderBy: [{ routeId: 'asc' }, { sequence: 'asc' }],
  })
  return NextResponse.json({
    checkpoints: checkpoints.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      routeId: c.routeId,
      routeName: c.route.name,
      location: c.location?.name ?? null,
      lat: c.lat,
      lng: c.lng,
      radiusM: c.radiusM,
      sequence: c.sequence,
      expectedWindowMin: c.expectedWindowMin,
      description: c.description,
    })),
  })
}
