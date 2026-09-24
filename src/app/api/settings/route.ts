import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const settings = await db.systemSetting.findAll()
  const map: Record<string, string> = {}
  for (const s of settings) {
    if (s.key) map[s.key] = s.value
  }
  return NextResponse.json({ settings: map })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can change settings.' }, { status: 403 })
  }
  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    const existing = await db.systemSetting.findOne('key', key)
    if (existing) {
      await db.systemSetting.update(existing.id, { value: String(value) })
    } else {
      await db.systemSetting.create({ key, value: String(value) })
    }
  }
  await db.auditLog.create({
    userId: user.id,
    action: 'SETTINGS_UPDATE',
    entity: 'SystemSetting',
    details: `Updated settings: ${Object.keys(body).join(', ')}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })
  return NextResponse.json({ ok: true })
}
