import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.notification.update(id, { read: true })
  return NextResponse.json({ ok: true })
}
