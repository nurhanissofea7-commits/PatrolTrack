import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const body = await req.json()
  await db.incident.update(id, { status: body.status })
  await db.auditLog.create({
    userId: user.id,
    action: 'INCIDENT_UPDATE',
    entity: 'Incident',
    entityId: id,
    details: `Incident status set to ${body.status}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })
  return NextResponse.json({ ok: true })
}
