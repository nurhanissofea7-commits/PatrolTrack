import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db, generateId } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const users = await db.user.findAll()
  const result = []
  for (const u of users) {
    const guard = u.id ? await db.guard.findOne('userId', u.id) : null
    let supervisorInfo = null
    if (guard?.supervisorId) {
      const sup = await db.supervisor.findById(guard.supervisorId)
      if (sup) {
        const supUser = await db.user.findById(sup.userId)
        supervisorInfo = { id: sup.id, name: supUser?.name || 'Unknown' }
      }
    }
    const supervisor = u.id ? await db.supervisor.findOne('userId', u.id) : null
    result.push({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone ?? null,
      avatarColor: u.avatarColor || 'emerald',
      status: u.status || 'ACTIVE',
      failedLogins: u.failedLogins || 0,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
      guard: guard ? {
        id: guard.id,
        employeeId: guard.employeeId,
        rank: guard.rank,
        shift: guard.shift,
        supervisor: supervisorInfo,
      } : null,
      supervisor: supervisor ? { id: supervisor.id, department: supervisor.department } : null,
    })
  }
  result.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ users: result })
}

// POST /api/users — create a new user (admin only)
export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const body = await req.json()
  if (!body?.email || !body?.name || !body?.password || !body?.role) {
    return NextResponse.json({ error: 'Name, email, password and role are required.' }, { status: 400 })
  }
  const role = body.role.toUpperCase()
  if (!['ADMIN', 'SUPERVISOR', 'GUARD'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  const existing = await db.user.findOne('email', body.email.toLowerCase())
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  const userId = generateId()
  await db.user.create({
    id: userId,
    email: body.email.toLowerCase(),
    name: body.name,
    role,
    passwordHash: hashPassword(body.password),
    phone: body.phone || null,
    avatarColor: body.avatarColor || 'emerald',
    status: 'ACTIVE',
    failedLogins: 0,
  })

  if (role === 'GUARD') {
    const guardCount = (await db.guard.findAll()).length
    const employeeId = `SEC-${new Date().getFullYear()}-${String(guardCount + 1).padStart(4, '0')}`
    await db.guard.create({
      userId,
      employeeId,
      rank: body.rank || 'Officer',
      shift: body.shift || 'DAY',
      supervisorId: body.supervisorId || null,
      licenseNumber: body.licenseNumber || null,
      status: 'OFF_DUTY',
      isOnline: false,
      rating: 5.0,
      hireDate: new Date(),
    })
  } else if (role === 'SUPERVISOR') {
    await db.supervisor.create({
      userId,
      department: body.department || 'Operations',
    })
  }

  await db.auditLog.create({
    userId: currentUser.id,
    action: 'USER_CREATE',
    entity: 'User',
    entityId: userId,
    details: `Created ${role.toLowerCase()} account: ${body.name} (${body.email})`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ id: userId, ok: true })
}
