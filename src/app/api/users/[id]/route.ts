import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db, generateId } from '@/lib/firebase'
import { getCurrentUser } from '@/lib/auth'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

// PATCH /api/users/[id] — update a user (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const target = await db.user.findById(id)
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  // Prevent the last admin from disabling/demoting themselves
  if (target.role === 'ADMIN' && (body.status === 'DISABLED' || body.role === 'GUARD' || body.role === 'SUPERVISOR')) {
    const allUsers = await db.user.findAll()
    const adminCount = allUsers.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE').length
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot demote or disable the last administrator.' }, { status: 400 })
    }
  }

  const newRole = body.role ? body.role.toUpperCase() : target.role

  // Update user fields
  const updateData: Record<string, any> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.email !== undefined) updateData.email = body.email.toLowerCase()
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.avatarColor !== undefined) updateData.avatarColor = body.avatarColor
  if (body.status !== undefined) {
    updateData.status = body.status
    updateData.failedLogins = body.status === 'ACTIVE' ? 0 : target.failedLogins
  }
  if (body.role !== undefined) updateData.role = newRole
  await db.user.update(id, updateData)

  // Role change: create/remove guard/supervisor records
  if (body.role && body.role.toUpperCase() !== target.role) {
    const existingGuard = await db.guard.findOne('userId', id)
    if (existingGuard) await db.guard.delete(existingGuard.id)
    const existingSup = await db.supervisor.findOne('userId', id)
    if (existingSup) await db.supervisor.delete(existingSup.id)

    if (body.role.toUpperCase() === 'GUARD') {
      const guardCount = (await db.guard.findAll()).length
      await db.guard.create({
        userId: id,
        employeeId: `SEC-${new Date().getFullYear()}-${String(guardCount + 1).padStart(4, '0')}`,
        rank: body.rank || 'Officer',
        shift: body.shift || 'DAY',
        supervisorId: body.supervisorId || null,
        status: 'OFF_DUTY',
        isOnline: false,
        rating: 5.0,
        hireDate: new Date(),
      })
    } else if (body.role.toUpperCase() === 'SUPERVISOR') {
      await db.supervisor.create({
        userId: id,
        department: body.department || 'Operations',
      })
    }
  } else {
    // Update existing role-specific fields
    const guard = await db.guard.findOne('userId', id)
    if (guard && (body.rank || body.shift || body.supervisorId !== undefined || body.licenseNumber !== undefined)) {
      const guardUpdate: Record<string, any> = {}
      if (body.rank !== undefined) guardUpdate.rank = body.rank
      if (body.shift !== undefined) guardUpdate.shift = body.shift
      if (body.supervisorId !== undefined) guardUpdate.supervisorId = body.supervisorId || null
      if (body.licenseNumber !== undefined) guardUpdate.licenseNumber = body.licenseNumber
      await db.guard.update(guard.id, guardUpdate)
    }
    const sup = await db.supervisor.findOne('userId', id)
    if (sup && body.department) {
      await db.supervisor.update(sup.id, { department: body.department })
    }
  }

  await db.auditLog.create({
    userId: currentUser.id,
    action: 'USER_MODIFY',
    entity: 'User',
    entityId: id,
    details: `Updated user ${target.name} — ${Object.keys(body).join(', ')}`,
    ip: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ ok: true })
}
