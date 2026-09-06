import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const body = await req.json()
  const updated = await db.incident.update({
    where: { id },
    data: { status: body.status },
  })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'INCIDENT_UPDATE',
      entity: 'Incident',
      entityId: id,
      details: `Incident status set to ${body.status}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })
  return NextResponse.json({ incident: updated })
}
