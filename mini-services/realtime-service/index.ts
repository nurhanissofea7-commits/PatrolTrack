// PatrolTrack Real-Time Service — Socket.IO
// Port 3003. Handles live GPS tracking, SOS, notifications.
// Connected clients fetch initial data from the Next.js API and receive live updates here.

import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ── In-memory live state ──
// Guard live positions keyed by guardId.
interface GuardPos {
  guardId: string
  guardName: string
  lat: number
  lng: number
  accuracy: number
  status: string
  patrolId: string | null
  routeName: string | null
  battery: number
  lastUpdate: number
}

const guardPositions = new Map<string, GuardPos>()

// Seed: Ahmad on active patrol — simulated movement around Building A.
// Coordinates around CAMPUS (3.1390, 101.6869).
const CAMPUS = { lat: 3.1390, lng: 101.6869 }
function offset(lat: number, lng: number, dLatM: number, dLngM: number) {
  const dLat = dLatM / 111111
  const dLng = dLngM / (111111 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: lng + dLngM ? lng + dLng : lng }
}

// Seed initial positions for a handful of guards (Ahmad, Raj, Siti)
// These will be overwritten by any client that pushes a real position update.
guardPositions.set('seed-ahmad', {
  guardId: 'seed-ahmad',
  guardName: 'Ahmad Rahman',
  lat: offset(CAMPUS.lat, CAMPUS.lng, 75, 40).lat,
  lng: offset(CAMPUS.lat, CAMPUS.lng, 75, 40).lng,
  accuracy: 6.4,
  status: 'ON_PATROL',
  patrolId: 'seed-active',
  routeName: 'Building A – Night Patrol',
  battery: 78,
  lastUpdate: Date.now(),
})
guardPositions.set('seed-raj', {
  guardId: 'seed-raj',
  guardName: 'Raj Kumar',
  lat: offset(CAMPUS.lat, CAMPUS.lng, -60, 80).lat,
  lng: offset(CAMPUS.lat, CAMPUS.lng, -60, 80).lng,
  accuracy: 4.1,
  status: 'ON_DUTY',
  patrolId: null,
  routeName: null,
  battery: 92,
  lastUpdate: Date.now(),
})
guardPositions.set('seed-siti', {
  guardId: 'seed-siti',
  guardName: 'Siti Nurhaliza',
  lat: offset(CAMPUS.lat, CAMPUS.lng, -50, -40).lat,
  lng: offset(CAMPUS.lat, CAMPUS.lng, -50, -40).lng,
  accuracy: 5.0,
  status: 'ON_DUTY',
  patrolId: null,
  routeName: null,
  battery: 64,
  lastUpdate: Date.now(),
})

// ── Simulated movement for Ahmad (active patrol) ──
// Walks a small loop near Building A to keep the live map lively.
const ahmadLoop = [
  { dLat: 75, dLng: 40 },
  { dLat: 80, dLng: 50 },
  { dLat: 85, dLng: 55 },
  { dLat: 90, dLng: 60 },
  { dLat: 95, dLng: 65 },
  { dLat: 100, dLng: 60 },
  { dLat: 95, dLng: 55 },
  { dLat: 88, dLng: 50 },
  { dLat: 82, dLng: 45 },
  { dLat: 78, dLng: 42 },
]
let ahmadStep = 0

setInterval(() => {
  ahmadStep = (ahmadStep + 1) % ahmadLoop.length
  const step = ahmadLoop[ahmadStep]
  const pos = guardPositions.get('seed-ahmad')
  if (!pos) return
  // Add a little jitter for realism
  const target = offset(CAMPUS.lat, CAMPUS.lng, step.dLat + (Math.random() - 0.5) * 3, step.dLng + (Math.random() - 0.5) * 3)
  pos.lat = target.lat
  pos.lng = target.lng
  pos.accuracy = 4 + Math.random() * 4
  pos.battery = Math.max(20, pos.battery - (Math.random() < 0.1 ? 1 : 0))
  pos.lastUpdate = Date.now()
  io.emit('guard:position', { ...pos })
}, 4000)

// ── Socket handlers ──
io.on('connection', (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`)

  // Send the full current snapshot to a newly connected supervisor dashboard
  socket.emit('guards:snapshot', Array.from(guardPositions.values()))

  // A guard (or simulated device) pushes a position update.
  socket.on('guard:position', (data: Partial<GuardPos> & { guardId: string }) => {
    const existing = guardPositions.get(data.guardId)
    const updated: GuardPos = {
      guardId: data.guardId,
      guardName: data.guardName || existing?.guardName || 'Unknown Guard',
      lat: data.lat ?? existing?.lat ?? 0,
      lng: data.lng ?? existing?.lng ?? 0,
      accuracy: data.accuracy ?? existing?.accuracy ?? 0,
      status: data.status ?? existing?.status ?? 'ON_DUTY',
      patrolId: data.patrolId ?? existing?.patrolId ?? null,
      routeName: data.routeName ?? existing?.routeName ?? null,
      battery: data.battery ?? existing?.battery ?? 100,
      lastUpdate: Date.now(),
    }
    guardPositions.set(data.guardId, updated)
    io.emit('guard:position', { ...updated })
  })

  // SOS / emergency alert broadcast
  socket.on('sos:activate', (data: { guardId: string; guardName: string; lat: number; lng: number; accuracy: number; locationLabel?: string; message?: string }) => {
    const alert = {
      id: `sos-${Date.now()}`,
      ...data,
      status: 'ACTIVE',
      timestamp: Date.now(),
    }
    io.emit('sos:alert', alert)
    console.log(`[realtime] SOS activated by ${data.guardName}`)
  })

  socket.on('sos:resolve', (data: { alertId: string }) => {
    io.emit('sos:resolved', { id: data.alertId, resolvedAt: Date.now() })
  })

  // Notifications broadcast
  socket.on('notification:broadcast', (data: { id?: string; type: string; title: string; message: string; priority?: string }) => {
    io.emit('notification', {
      id: data.id || `n-${Date.now()}`,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'NORMAL',
      timestamp: Date.now(),
    })
  })

  // Checkpoint verification event (when a guard submits a checkpoint)
  socket.on('checkpoint:verified', (data: { guardId: string; guardName: string; checkpointCode: string; checkpointName: string; status: string; sessionId: string }) => {
    io.emit('checkpoint:update', {
      ...data,
      timestamp: Date.now(),
    })
  })

  socket.on('disconnect', () => {
    console.log(`[realtime] client disconnected: ${socket.id}`)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[realtime] PatrolTrack socket.io server running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
