import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const guards = await db.guard.findMany({
    include: { user: true, supervisor: { include: { user: true } } },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json({
    guards: guards.map((g) => ({
      id: g.id,
      employeeId: g.employeeId,
      name: g.user.name,
      email: g.user.email,
      phone: g.user.phone,
      avatarColor: g.user.avatarColor,
      rank: g.rank,
      shift: g.shift,
      status: g.status,
      isOnline: g.isOnline,
      rating: g.rating,
      supervisor: g.supervisor ? { id: g.supervisor.id, name: g.supervisor.user.name } : null,
      currentLat: g.currentLat,
      currentLng: g.currentLng,
      currentAccuracy: g.currentAccuracy,
      lastLocationAt: g.lastLocationAt,
      batteryLevel: g.batteryLevel,
      deviceInfo: g.deviceInfo,
      licenseNumber: g.licenseNumber,
      hireDate: g.hireDate,
      userStatus: g.user.status,
    })),
  })
}
