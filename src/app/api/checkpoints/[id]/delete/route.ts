import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

// POST - Delete checkpoint (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params

  const checkpoint = await db.checkpoint.findById(id)
  await db.checkpoint.delete(id)

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'CHECKPOINT_DELETE',
      entity: 'Checkpoint',
      entityId: id,
      details: `Deleted checkpoint: ${checkpoint?.code || id}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  } as any)

  return NextResponse.json({ ok: true })
}