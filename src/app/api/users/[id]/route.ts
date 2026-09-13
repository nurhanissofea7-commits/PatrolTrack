import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

// PATCH /api/users/[id] — update a user (admin only)
// Body can include: name, email, phone, avatarColor, status, role, rank, shift,
// supervisorId, licenseNumber, department
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const target = await db.user.findUnique({ where: { id }, include: { guard: true, supervisor: true } })
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  // Prevent the last admin from disabling themselves / demoting themselves
  if (target.role === 'ADMIN' && (body.status === 'DISABLED' || body.role === 'GUARD' || body.role === 'SUPERVISOR')) {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot demote or disable the last administrator.' }, { status: 400 })
    }
  }

  await db.$transaction(async (tx) => {
    const newRole = body.role ? body.role.toUpperCase() : target.role
    await tx.user.update({
      where: { id },
      data: {
        name: body.name ?? target.name,
        email: body.email ? body.email.toLowerCase() : target.email,
        phone: body.phone !== undefined ? body.phone : target.phone,
        avatarColor: body.avatarColor ?? target.avatarColor,
        status: body.status ?? target.status,
        role: newRole,
        failedLogins: body.status === 'ACTIVE' ? 0 : target.failedLogins,
      },
    })

    // Role change: create/remove guard/supervisor records
    if (body.role && body.role.toUpperCase() !== target.role) {
      // Remove old role records
      if (target.guard) await tx.guard.delete({ where: { id: target.guard.id } })
      if (target.supervisor) await tx.supervisor.delete({ where: { id: target.supervisor.id } })
      // Create new role record
      if (body.role.toUpperCase() === 'GUARD') {
        const count = await tx.guard.count()
        await tx.guard.create({
          data: {
            userId: id,
            employeeId: `SEC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
            rank: body.rank || 'Officer',
            shift: body.shift || 'DAY',
            supervisorId: body.supervisorId || null,
          },
        })
      } else if (body.role.toUpperCase() === 'SUPERVISOR') {
        await tx.supervisor.create({
          data: { userId: id, department: body.department || 'Operations' },
        })
      }
    } else {
      // Update existing role-specific fields
      if (target.guard && (body.rank || body.shift || body.supervisorId !== undefined || body.licenseNumber !== undefined)) {
        await tx.guard.update({
          where: { id: target.guard.id },
          data: {
            rank: body.rank ?? target.guard.rank,
            shift: body.shift ?? target.guard.shift,
            supervisorId: body.supervisorId === undefined ? target.guard.supervisorId : body.supervisorId || null,
            licenseNumber: body.licenseNumber !== undefined ? body.licenseNumber : target.guard.licenseNumber,
          },
        })
      }
      if (target.supervisor && body.department) {
        await tx.supervisor.update({
          where: { id: target.supervisor.id },
          data: { department: body.department },
        })
      }
    }

    await tx.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'USER_MODIFY',
        entity: 'User',
        entityId: id,
        details: `Updated user ${target.name} — ${Object.keys(body).join(', ')}`,
        ip: req.headers.get('x-forwarded-for') || undefined,
      },
    })
  })

  return NextResponse.json({ ok: true })
}
