import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update checkpoint code/name (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  await db.checkpoint.update(id, {
    code: body.code,
    name: body.name,
    description: body.description || null,
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'CHECKPOINT_UPDATE',
      entity: 'Checkpoint',
      entityId: id,
      details: `Updated checkpoint: ${body.code} (${body.name})`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  } as any)

  return NextResponse.json({ ok: true })
}