import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { makeSessionCookie, SESSION_COOKIE } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  const user = await db.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { guard: true, supervisor: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }
  if (user.status === 'LOCKED') {
    return NextResponse.json({ error: 'Account locked. Contact administrator.' }, { status: 403 })
  }
  if (user.passwordHash !== hashPassword(body.password)) {
    const failed = user.failedLogins + 1
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: failed, status: failed >= 5 ? 'LOCKED' : user.status },
    })
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        details: `Failed login attempt (${failed}/5)`,
        ip: req.headers.get('x-forwarded-for') || undefined,
      },
    })
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lastLoginAt: new Date() },
  })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      details: `${user.name} signed in`,
      ip: req.headers.get('x-forwarded-for') || undefined,
      deviceInfo: req.headers.get('user-agent') || undefined,
    },
  })

  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    guardId: user.guard?.id ?? null,
    supervisorId: user.supervisor?.id ?? null,
  }
  const res = NextResponse.json({ user: session })
  // Detect if the request came over HTTPS (preview is HTTPS; localhost dev is HTTP).
  // On HTTPS we use SameSite=None; Secure so the cookie survives in cross-origin
  // / embedded preview iframes. On HTTP (local dev) we fall back to SameSite=lax.
  const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:'
  res.cookies.set(SESSION_COOKIE, makeSessionCookie(session), {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
