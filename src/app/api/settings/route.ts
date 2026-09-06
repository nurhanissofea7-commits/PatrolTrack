import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const settings = await db.systemSetting.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value
  return NextResponse.json({ settings: map })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can change settings.' }, { status: 403 })
  }
  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    await db.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'SETTINGS_UPDATE',
      entity: 'SystemSetting',
      details: `Updated settings: ${Object.keys(body).join(', ')}`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })
  return NextResponse.json({ ok: true })
}
