import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db, generateId } from '@/lib/firebase'
import { makeSessionToken, SESSION_COOKIE } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  const user = await db.user.findOne('email', body.email.toLowerCase())
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }
  if (user.status === 'LOCKED') {
    return NextResponse.json({ error: 'Account locked. Contact administrator.' }, { status: 403 })
  }
  if (user.passwordHash !== hashPassword(body.password)) {
    const failed = (user.failedLogins || 0) + 1
    await db.user.update(user.id, { failedLogins: failed, status: failed >= 5 ? 'LOCKED' : user.status })
    await db.auditLog.create({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entity: 'User',
      details: `Failed login attempt (${failed}/5)`,
      ip: req.headers.get('x-forwarded-for') || undefined,
    })
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  await db.user.update(user.id, { failedLogins: 0, lastLoginAt: new Date() })
  await db.auditLog.create({
    userId: user.id,
    action: 'USER_LOGIN',
    entity: 'User',
    details: `${user.name} signed in`,
    ip: req.headers.get('x-forwarded-for') || undefined,
    deviceInfo: req.headers.get('user-agent') || undefined,
  })

  // Look up guard/supervisor records
  const guard = await db.guard.findOne('userId', user.id)
  const supervisor = await db.supervisor.findOne('userId', user.id)

  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    guardId: guard?.id ?? null,
    supervisorId: supervisor?.id ?? null,
  }
  const token = makeSessionToken(session)
  const res = NextResponse.json({ user: session, token })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
