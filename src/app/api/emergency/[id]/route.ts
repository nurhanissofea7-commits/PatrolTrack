import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Acknowledge/Resolve an SOS alert (supervisor/admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role === 'GUARD') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  await db.emergencyAlert.update(id, {
    status: body.status || 'RESOLVED',
    acknowledgedAt: new Date(),
    resolvedAt: body.status === 'RESOLVED' ? new Date() : undefined,
  })

  return NextResponse.json({ ok: true })
}