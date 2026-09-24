import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET() {
  const guards = await db.guard.findAll()
  const result = []
  for (const g of guards) {
    const user = await db.user.findById(g.userId)
    let supervisor = null
    if (g.supervisorId) {
      const sup = await db.supervisor.findById(g.supervisorId)
      if (sup) {
        const supUser = await db.user.findById(sup.userId)
        supervisor = { id: sup.id, name: supUser?.name || 'Unknown' }
      }
    }
    result.push({
      id: g.id,
      employeeId: g.employeeId,
      name: user?.name || 'Unknown',
      email: user?.email || '',
      phone: user?.phone || null,
      avatarColor: user?.avatarColor || 'emerald',
      rank: g.rank,
      shift: g.shift,
      status: g.status,
      isOnline: g.isOnline,
      rating: g.rating || 5,
      supervisor,
      currentLat: g.currentLat ?? null,
      currentLng: g.currentLng ?? null,
      currentAccuracy: g.currentAccuracy ?? null,
      lastLocationAt: g.lastLocationAt || null,
      batteryLevel: g.batteryLevel ?? null,
      deviceInfo: g.deviceInfo ?? null,
      licenseNumber: g.licenseNumber ?? null,
      hireDate: g.hireDate || new Date(),
      userStatus: user?.status || 'ACTIVE',
    })
  }
  result.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ guards: result })
}
