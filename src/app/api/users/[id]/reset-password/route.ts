import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

// POST /api/users/[id]/reset-password — reset a user's password (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  if (!body?.password || body.password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
  }

  const target = await db.user.findById(id)
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  await db.user.update(id, {
    passwordHash: hashPassword(body.password),
    failedLogins: 0,
    status: target.status === 'LOCKED' ? 'ACTIVE' : target.status,
  })

  await db.auditLog.create({
    userId: currentUser.id,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: id,
    details: `Reset password for ${target.name}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ ok: true })
}
