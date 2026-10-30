import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// POST - Delete route and all its checkpoints (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params

  // Delete all checkpoints for this route
  const checkpoints = await db.checkpoint.findMany({ routeId: id })
  for (const cp of checkpoints) {
    await db.checkpoint.delete(cp.id)
  }

  // Delete the route
  await db.patrolRoute.delete(id)

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'ROUTE_DELETE',
      entity: 'PatrolRoute',
      entityId: id,
      details: `Deleted route and ${checkpoints.length} checkpoints`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  } as any)

  return NextResponse.json({ ok: true })
}