import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

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
