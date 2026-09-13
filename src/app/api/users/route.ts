import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

function requireAdmin() {
  // Returns null if allowed, else an error response
}

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const users = await db.user.findMany({
    include: { guard: { include: { supervisor: { include: { user: true } } } }, supervisor: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      avatarColor: u.avatarColor,
      status: u.status,
      failedLogins: u.failedLogins,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      guard: u.guard ? {
        id: u.guard.id,
        employeeId: u.guard.employeeId,
        rank: u.guard.rank,
        shift: u.guard.shift,
        supervisor: u.guard.supervisor ? { id: u.guard.supervisor.id, name: u.guard.supervisor.user.name } : null,
      } : null,
      supervisor: u.supervisor ? { id: u.supervisor.id, department: u.supervisor.department } : null,
    })),
  })
}

// POST /api/users — create a new user (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
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

  const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  // Generate a unique employee ID for guards
  const newId = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        role,
        passwordHash: hashPassword(body.password),
        phone: body.phone || null,
        avatarColor: body.avatarColor || 'emerald',
      },
    })

    if (role === 'GUARD') {
      const count = await tx.guard.count()
      const employeeId = `SEC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
      await tx.guard.create({
        data: {
          userId: newUser.id,
          employeeId,
          rank: body.rank || 'Officer',
          shift: body.shift || 'DAY',
          supervisorId: body.supervisorId || null,
          licenseNumber: body.licenseNumber || null,
        },
      })
    } else if (role === 'SUPERVISOR') {
      await tx.supervisor.create({
        data: {
          userId: newUser.id,
          department: body.department || 'Operations',
        },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: newUser.id,
        details: `Created ${role.toLowerCase()} account: ${newUser.name} (${newUser.email})`,
        ip: req.headers.get('x-forwarded-for') || undefined,
      },
    })
    return newUser
  })

  return NextResponse.json({ id: newId.id, ok: true })
}
