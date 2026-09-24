// PatrolTrack – Firestore seed script
// Run with: npx tsx prisma/seed.ts
import { db, generateId } from '../src/lib/firebase'
import { createHash } from 'crypto'

function hashPassword(pw: string) {
  return createHash('sha256').update('patroltrack$' + pw).digest('hex')
}

const CAMPUS = { lat: 3.139, lng: 101.6869 }

function offset(lat: number, lng: number, dLatM: number, dLngM: number) {
  const dLat = dLatM / 111111
  const dLng = dLngM / (111111 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: lng + dLng }
}

async function main() {
  console.log('Seeding Firestore database...')

  // ── System settings ──
  const settings = [
    { key: 'checkpoint.radius.default', value: '20' },
    { key: 'patrol.autoFlag.speedKmh', value: '60' },
    { key: 'patrol.sos.requireConfirm', value: 'true' },
    { key: 'auth.maxFailedLogins', value: '5' },
    { key: 'org.name', value: 'Sentinel Security Sdn. Bhd.' },
    { key: 'org.timezone', value: 'Asia/Kuala_Lumpur' },
  ]
  for (const s of settings) {
    const existing = await db.systemSetting.findOne('key', s.key)
    if (existing) {
      await db.systemSetting.update(existing.id, { value: s.value })
    } else {
      await db.systemSetting.create(s)
    }
  }

  // ── Users ──
  const adminUser = await db.user.create({
    email: 'admin@patroltrack.io',
    name: 'System Administrator',
    role: 'ADMIN',
    passwordHash: hashPassword('admin123'),
    avatarColor: 'violet',
    phone: '+6012-345-0001',
    status: 'ACTIVE',
    failedLogins: 0,
  })

  const sup1User = await db.user.create({
    email: 'hafiz@patroltrack.io',
    name: 'Mohd Hafiz',
    role: 'SUPERVISOR',
    passwordHash: hashPassword('super123'),
    avatarColor: 'emerald',
    phone: '+6012-345-0002',
    status: 'ACTIVE',
    failedLogins: 0,
  })
  const sup2User = await db.user.create({
    email: 'sarah@patroltrack.io',
    name: 'Sarah Chen',
    role: 'SUPERVISOR',
    passwordHash: hashPassword('super123'),
    avatarColor: 'rose',
    phone: '+6012-345-0003',
    status: 'ACTIVE',
    failedLogins: 0,
  })

  const sup1 = await db.supervisor.create({ userId: sup1User.id, department: 'Night Operations' })
  const sup2 = await db.supervisor.create({ userId: sup2User.id, department: 'Day Operations' })

  const guards = [
    { name: 'Ahmad Rahman', email: 'ahmad@patroltrack.io', color: 'emerald', shift: 'NIGHT', rank: 'Senior Officer', empId: 'SEC-2018', supId: sup1.id, license: 'PSG-2018-04421', rating: 4.9 },
    { name: 'Siti Nurhaliza', email: 'siti@patroltrack.io', color: 'rose', shift: 'DAY', rank: 'Officer', empId: 'SEC-2021-0088', supId: sup2.id, license: 'PSG-2021-09112', rating: 4.7 },
    { name: 'Tan Wei Ming', email: 'tanwm@patroltrack.io', color: 'amber', shift: 'ROTATING', rank: 'Officer', empId: 'SEC-2022-0317', supId: sup1.id, license: 'PSG-2022-01055', rating: 4.5 },
    { name: 'Raj Kumar', email: 'raj@patroltrack.io', color: 'cyan', shift: 'NIGHT', rank: 'Officer', empId: 'SEC-2020-0412', supId: sup1.id, license: 'PSG-2020-07321', rating: 4.8 },
    { name: 'Lim Chee Keong', email: 'limck@patroltrack.io', color: 'orange', shift: 'DAY', rank: 'Senior Officer', empId: 'SEC-2017-0119', supId: sup2.id, license: 'PSG-2017-00219', rating: 4.6 },
    { name: 'Fatima Aisha', email: 'fatima@patroltrack.io', color: 'fuchsia', shift: 'ROTATING', rank: 'Officer', empId: 'SEC-2023-0566', supId: sup2.id, license: 'PSG-2023-11008', rating: 4.4 },
  ]

  const guardRecords = []
  for (const g of guards) {
    const u = await db.user.create({
      email: g.email,
      name: g.name,
      role: 'GUARD',
      passwordHash: hashPassword('guard123'),
      avatarColor: g.color,
      phone: '+6012-345-' + g.empId.slice(-4),
      lastLoginAt: new Date(),
      status: 'ACTIVE',
      failedLogins: 0,
    })
    const gr = await db.guard.create({
      userId: u.id,
      employeeId: g.empId,
      rank: g.rank,
      shift: g.shift,
      supervisorId: g.supId,
      licenseNumber: g.license,
      rating: g.rating,
      isOnline: true,
      status: 'OFF_DUTY',
      hireDate: new Date(),
    })
    guardRecords.push({ ...gr, user: u, color: g.color })
  }

  // Ahmad on active patrol
  const ahmad = guardRecords[0]
  const ahmadPos = offset(CAMPUS.lat, CAMPUS.lng, 40, 30)
  await db.guard.update(ahmad.id, {
    status: 'ON_PATROL',
    isOnline: true,
    currentLat: ahmadPos.lat,
    currentLng: ahmadPos.lng,
    currentAccuracy: 6.4,
    lastLocationAt: new Date(),
    batteryLevel: 78,
    deviceInfo: 'Samsung Galaxy A54 / Android 14',
  })

  // Raj on duty
  const raj = guardRecords[3]
  const rajPos = offset(CAMPUS.lat, CAMPUS.lng, -60, 80)
  await db.guard.update(raj.id, {
    status: 'ON_DUTY',
    isOnline: true,
    currentLat: rajPos.lat,
    currentLng: rajPos.lng,
    currentAccuracy: 4.1,
    lastLocationAt: new Date(),
    batteryLevel: 92,
    deviceInfo: 'Xiaomi Redmi Note 12 / Android 13',
  })

  // Siti on duty
  const siti = guardRecords[1]
  const sitiPos = offset(CAMPUS.lat, CAMPUS.lng, -50, -40)
  await db.guard.update(siti.id, {
    status: 'ON_DUTY',
    isOnline: true,
    currentLat: sitiPos.lat,
    currentLng: sitiPos.lng,
    currentAccuracy: 5.0,
    lastLocationAt: new Date(),
    batteryLevel: 64,
    deviceInfo: 'iPhone 13 / iOS 17',
  })

  // ── Locations ──
  const locA = await db.location.create({ name: 'Building A – Corporate Tower', address: 'Block A, Jalan Sentral, KL', lat: CAMPUS.lat + 0.0009, lng: CAMPUS.lng + 0.0006 })
  const locB = await db.location.create({ name: 'Building B – Logistics Wing', address: 'Block B, Jalan Sentral, KL', lat: CAMPUS.lat - 0.0008, lng: CAMPUS.lng + 0.001 })
  const locP = await db.location.create({ name: 'Perimeter & Parking Zone', address: 'Outer Ring, Jalan Sentral, KL', lat: CAMPUS.lat - 0.0005, lng: CAMPUS.lng - 0.0008 })

  // ── Routes + Checkpoints ──
  const routeA = await db.patrolRoute.create({
    name: 'Building A – Night Patrol',
    locationId: locA.id,
    startLat: offset(CAMPUS.lat, CAMPUS.lng, 40, 0).lat,
    startLng: offset(CAMPUS.lat, CAMPUS.lng, 40, 0).lng,
    estimatedDurationMin: 90,
    estimatedDistanceM: 720,
    description: 'Full internal sweep of Building A including lobby, stairwells, roof access and emergency exits.',
    status: 'ACTIVE',
  })
  const routeACheckpoints = [
    { code: 'A-CP01', name: 'Main Entrance', dLat: 35, dLng: -10, seq: 1, win: 5 },
    { code: 'A-CP02', name: 'Ground Lobby', dLat: 55, dLng: 5, seq: 2, win: 12 },
    { code: 'A-CP03', name: 'Reception Desk', dLat: 70, dLng: 20, seq: 3, win: 18 },
    { code: 'A-CP04', name: 'East Stairwell', dLat: 85, dLng: 45, seq: 4, win: 25 },
    { code: 'A-CP05', name: 'Server Room Door', dLat: 95, dLng: 60, seq: 5, win: 35 },
    { code: 'A-CP06', name: 'Emergency Exit B1', dLat: 80, dLng: 80, seq: 6, win: 45 },
    { code: 'A-CP07', name: 'Roof Access', dLat: 110, dLng: 50, seq: 7, win: 55 },
    { code: 'A-CP08', name: 'Loading Bay Rear', dLat: 60, dLng: 90, seq: 8, win: 65 },
  ]
  for (const cp of routeACheckpoints) {
    const p = offset(CAMPUS.lat, CAMPUS.lng, cp.dLat, cp.dLng)
    await db.checkpoint.create({
      code: cp.code,
      name: cp.name,
      routeId: routeA.id,
      locationId: locA.id,
      lat: p.lat,
      lng: p.lng,
      radiusM: 20,
      sequence: cp.seq,
      expectedWindowMin: cp.win,
      description: `${cp.name} checkpoint on the Building A night route.`,
    })
  }

  const routeP = await db.patrolRoute.create({
    name: 'Perimeter & Parking Patrol',
    locationId: locP.id,
    startLat: offset(CAMPUS.lat, CAMPUS.lng, -50, -40).lat,
    startLng: offset(CAMPUS.lat, CAMPUS.lng, -50, -40).lng,
    estimatedDurationMin: 45,
    estimatedDistanceM: 540,
    description: 'Outer perimeter fence, parking areas and main gate checks.',
    status: 'ACTIVE',
  })
  const routePCheckpoints = [
    { code: 'P-CP01', name: 'Main Gate', dLat: -30, dLng: -60, seq: 1, win: 5 },
    { code: 'P-CP02', name: 'Visitor Parking', dLat: -55, dLng: -35, seq: 2, win: 12 },
    { code: 'P-CP03', name: 'North Fence', dLat: -40, dLng: -5, seq: 3, win: 20 },
    { code: 'P-CP04', name: 'Loading Dock', dLat: -70, dLng: 15, seq: 4, win: 28 },
    { code: 'P-CP05', name: 'Staff Parking', dLat: -50, dLng: 40, seq: 5, win: 35 },
  ]
  for (const cp of routePCheckpoints) {
    const p = offset(CAMPUS.lat, CAMPUS.lng, cp.dLat, cp.dLng)
    await db.checkpoint.create({
      code: cp.code,
      name: cp.name,
      routeId: routeP.id,
      locationId: locP.id,
      lat: p.lat,
      lng: p.lng,
      radiusM: 20,
      sequence: cp.seq,
      expectedWindowMin: cp.win,
      description: `${cp.name} on the perimeter route.`,
    })
  }

  const routeB = await db.patrolRoute.create({
    name: 'Building B – Day Patrol',
    locationId: locB.id,
    startLat: offset(CAMPUS.lat, CAMPUS.lng, -80, 100).lat,
    startLng: offset(CAMPUS.lat, CAMPUS.lng, -80, 100).lng,
    estimatedDurationMin: 60,
    estimatedDistanceM: 480,
    description: 'Daytime internal sweep of Building B logistics wing.',
    status: 'ACTIVE',
  })
  const routeBCheckpoints = [
    { code: 'B-CP01', name: 'B Entrance', dLat: -85, dLng: 95, seq: 1, win: 5 },
    { code: 'B-CP02', name: 'B Lobby', dLat: -95, dLng: 105, seq: 2, win: 12 },
    { code: 'B-CP03', name: 'Warehouse Floor', dLat: -110, dLng: 120, seq: 3, win: 20 },
    { code: 'B-CP04', name: 'Cold Storage', dLat: -105, dLng: 135, seq: 4, win: 30 },
    { code: 'B-CP05', name: 'Fire Panel', dLat: -90, dLng: 115, seq: 5, win: 40 },
    { code: 'B-CP06', name: 'B Exit', dLat: -75, dLng: 90, seq: 6, win: 50 },
  ]
  for (const cp of routeBCheckpoints) {
    const p = offset(CAMPUS.lat, CAMPUS.lng, cp.dLat, cp.dLng)
    await db.checkpoint.create({
      code: cp.code,
      name: cp.name,
      routeId: routeB.id,
      locationId: locB.id,
      lat: p.lat,
      lng: p.lng,
      radiusM: 20,
      sequence: cp.seq,
      expectedWindowMin: cp.win,
      description: `${cp.name} on the Building B day route.`,
    })
  }

  // ── Schedules ──
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  const tonStart = new Date(now); tonStart.setHours(22, 0, 0, 0)
  const tonEnd = new Date(now); tonEnd.setHours(23, 59, 0, 0)
  const tonightSched = await db.patrolSchedule.create({
    name: 'Night Patrol – Block A',
    routeId: routeA.id,
    guardId: ahmad.id,
    date: today,
    startTime: tonStart,
    endTime: tonEnd,
    priority: 'HIGH',
    instructions: 'Pay extra attention to the East Stairwell — recent reports of unauthorized personnel. Verify all emergency exits are unobstructed.',
    status: 'IN_PROGRESS',
    frequency: 'ONE_TIME',
  })

  const yStart = new Date(yesterday); yStart.setHours(22, 0, 0, 0)
  const yEnd = new Date(yesterday); yEnd.setHours(23, 50, 0, 0)
  const ySched = await db.patrolSchedule.create({
    name: 'Night Patrol – Block A',
    routeId: routeA.id,
    guardId: ahmad.id,
    date: yesterday,
    startTime: yStart,
    endTime: yEnd,
    priority: 'NORMAL',
    status: 'COMPLETED',
    frequency: 'ONE_TIME',
  })

  const twoStart = new Date(twoDaysAgo); twoStart.setHours(2, 0, 0, 0)
  const twoEnd = new Date(twoDaysAgo); twoEnd.setHours(2, 50, 0, 0)
  const twoSched = await db.patrolSchedule.create({
    name: 'Perimeter Patrol – Late Shift',
    routeId: routeP.id,
    guardId: raj.id,
    date: twoDaysAgo,
    startTime: twoStart,
    endTime: twoEnd,
    priority: 'NORMAL',
    status: 'COMPLETED',
    frequency: 'ONE_TIME',
  })

  const tmStart = new Date(tomorrow); tmStart.setHours(9, 0, 0, 0)
  const tmEnd = new Date(tomorrow); tmEnd.setHours(10, 0, 0, 0)
  const tmSched = await db.patrolSchedule.create({
    name: 'Building B – Morning Sweep',
    routeId: routeB.id,
    guardId: siti.id,
    date: tomorrow,
    startTime: tmStart,
    endTime: tmEnd,
    priority: 'NORMAL',
    status: 'SCHEDULED',
    frequency: 'ONE_TIME',
  })

  const tanStart = new Date(now.getTime() + 60 * 60 * 1000)
  const tanEnd = new Date(tanStart.getTime() + 45 * 60 * 1000)
  const tanSched = await db.patrolSchedule.create({
    name: 'Perimeter Patrol – Afternoon',
    routeId: routeP.id,
    guardId: guardRecords[2].id,
    date: today,
    startTime: tanStart,
    endTime: tanEnd,
    priority: 'NORMAL',
    status: 'SCHEDULED',
    frequency: 'ONE_TIME',
  })

  // ── Patrol Sessions ──
  const activeSession = await db.patrolSession.create({
    scheduleId: tonightSched.id,
    routeId: routeA.id,
    guardId: ahmad.id,
    status: 'ACTIVE',
    startedAt: new Date(now.getTime() - 35 * 60 * 1000),
    startLat: ahmadPos.lat,
    startLng: ahmadPos.lng,
    totalCheckpoints: 8,
    completedCount: 5,
    missedCount: 0,
    lateCount: 1,
  })

  const aCheckpoints = await db.checkpoint.findMany({ routeId: routeA.id })
  aCheckpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  const checklistGood = JSON.stringify([
    { q: 'Area clear of obstructions?', a: 'Yes' },
    { q: 'Emergency exit accessible?', a: 'Yes' },
    { q: 'Lighting functioning?', a: 'Yes' },
    { q: 'Security equipment normal?', a: 'Yes' },
    { q: 'Any suspicious activity?', a: 'No' },
    { q: 'Any safety hazards?', a: 'No' },
  ])
  const checklistFlag = JSON.stringify([
    { q: 'Area clear of obstructions?', a: 'No' },
    { q: 'Emergency exit accessible?', a: 'Yes' },
    { q: 'Lighting functioning?', a: 'Yes' },
    { q: 'Security equipment normal?', a: 'Yes' },
    { q: 'Any suspicious activity?', a: 'No' },
    { q: 'Any safety hazards?', a: 'Yes' },
  ])

  const sessionStart = new Date(now.getTime() - 35 * 60 * 1000)
  for (let i = 0; i < 5; i++) {
    const cp = aCheckpoints[i]
    const capturedAt = new Date(sessionStart.getTime() + (cp.sequence * 6 - 3) * 60 * 1000)
    const isLate = i === 2
    await db.checkpointVerification.create({
      sessionId: activeSession.id,
      checkpointId: cp.id,
      guardId: ahmad.id,
      photoUrl: i === 4 ? null : `/api/placeholder/checkpoint/${cp.code}`,
      capturedAt,
      serverTimestamp: capturedAt,
      clientTimestamp: capturedAt,
      deviceTimestamp: capturedAt,
      lat: cp.lat + (Math.random() - 0.5) * 0.00002,
      lng: cp.lng + (Math.random() - 0.5) * 0.00002,
      gpsAccuracy: 4 + Math.random() * 4,
      distanceToCheckpoint: Math.random() * 12,
      withinGeofence: true,
      checklist: i === 3 ? checklistFlag : checklistGood,
      notes: i === 3 ? 'Boxes stacked near Emergency Exit B1 — partially obstructed. Photo evidence attached.' : (i === 1 ? 'Lobby quiet, all lights operational.' : null),
      deviceInfo: 'Samsung Galaxy A54 / Android 14',
      status: 'VERIFIED',
      sequenceOrder: cp.sequence,
      isOnTime: !isLate,
      timingStatus: isLate ? 'LATE' : 'ON_TIME',
      suspicious: false,
    })
  }

  // Yesterday's completed session
  const ySession = await db.patrolSession.create({
    scheduleId: ySched.id,
    routeId: routeA.id,
    guardId: ahmad.id,
    status: 'COMPLETED',
    startedAt: yStart,
    endedAt: yEnd,
    totalCheckpoints: 8,
    completedCount: 8,
    missedCount: 0,
    lateCount: 0,
    durationMin: 110,
    report: 'All checkpoints verified on time. No incidents reported. Building A secure.',
  })
  for (let i = 0; i < 8; i++) {
    const cp = aCheckpoints[i]
    const capturedAt = new Date(yStart.getTime() + (cp.sequence * 11 + 2) * 60 * 1000)
    await db.checkpointVerification.create({
      sessionId: ySession.id,
      checkpointId: cp.id,
      guardId: ahmad.id,
      photoUrl: `/api/placeholder/checkpoint/${cp.code}`,
      capturedAt,
      serverTimestamp: capturedAt,
      clientTimestamp: capturedAt,
      deviceTimestamp: capturedAt,
      lat: cp.lat,
      lng: cp.lng,
      gpsAccuracy: 5,
      distanceToCheckpoint: 8,
      withinGeofence: true,
      checklist: checklistGood,
      deviceInfo: 'Samsung Galaxy A54 / Android 14',
      status: 'VERIFIED',
      sequenceOrder: cp.sequence,
      isOnTime: true,
      timingStatus: 'ON_TIME',
      suspicious: false,
    })
  }

  // Two days ago — Raj perimeter, completed with issues
  const pCheckpoints = await db.checkpoint.findMany({ routeId: routeP.id })
  pCheckpoints.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const twoSession = await db.patrolSession.create({
    scheduleId: twoSched.id,
    routeId: routeP.id,
    guardId: raj.id,
    status: 'COMPLETED_WITH_ISSUES',
    startedAt: twoStart,
    endedAt: new Date(twoStart.getTime() + 52 * 60 * 1000),
    totalCheckpoints: 5,
    completedCount: 4,
    missedCount: 1,
    lateCount: 1,
    durationMin: 52,
    suspiciousFlags: 1,
    report: 'CP04 Loading Dock not visited within time window (missed). CP03 reached late. Possible GPS accuracy issue flagged at CP02.',
  })
  for (let i = 0; i < pCheckpoints.length; i++) {
    const cp = pCheckpoints[i]
    if (cp.sequence === 4) continue // missed
    const capturedAt = new Date(twoStart.getTime() + (cp.sequence * 8 + 4) * 60 * 1000)
    const isLate = cp.sequence === 3
    const flagged = cp.sequence === 2
    await db.checkpointVerification.create({
      sessionId: twoSession.id,
      checkpointId: cp.id,
      guardId: raj.id,
      photoUrl: `/api/placeholder/checkpoint/${cp.code}`,
      capturedAt,
      serverTimestamp: capturedAt,
      clientTimestamp: capturedAt,
      deviceTimestamp: capturedAt,
      lat: cp.lat,
      lng: cp.lng,
      gpsAccuracy: flagged ? 28.4 : 6.2,
      distanceToCheckpoint: flagged ? 18 : 7,
      withinGeofence: true,
      checklist: checklistGood,
      deviceInfo: 'Xiaomi Redmi Note 12 / Android 13',
      status: flagged ? 'FLAGGED' : 'VERIFIED',
      sequenceOrder: cp.sequence,
      isOnTime: !isLate,
      timingStatus: isLate ? 'LATE' : 'ON_TIME',
      suspicious: flagged,
      suspiciousFlags: flagged ? JSON.stringify(['LOW_GPS_ACCURACY']) : null,
    })
  }
  // CP04 missed
  await db.checkpointVerification.create({
    sessionId: twoSession.id,
    checkpointId: pCheckpoints[3].id,
    guardId: raj.id,
    capturedAt: new Date(twoStart.getTime() + 40 * 60 * 1000),
    serverTimestamp: new Date(twoStart.getTime() + 40 * 60 * 1000),
    lat: 0,
    lng: 0,
    gpsAccuracy: 0,
    distanceToCheckpoint: -1,
    withinGeofence: false,
    checklist: '[]',
    status: 'MISSED',
    sequenceOrder: 4,
    timingStatus: 'MISSED',
    rejectionReason: 'Checkpoint not visited within expected time window.',
  })

  // ── Incidents ──
  await db.incident.create({
    sessionId: twoSession.id,
    guardId: raj.id,
    reportedById: raj.user.id,
    type: 'SUSPICIOUS',
    description: 'Unmarked white van parked near North Fence for over 40 minutes. Driver left on foot. License plate photographed. Reported to supervisor.',
    severity: 'MEDIUM',
    status: 'INVESTIGATING',
    lat: pCheckpoints[2].lat,
    lng: pCheckpoints[2].lng,
    locationLabel: 'North Fence – Perimeter',
    photoUrls: JSON.stringify(['/api/placeholder/incident/suspicious-van']),
    occurredAt: new Date(twoStart.getTime() + 18 * 60 * 1000),
  })
  await db.incident.create({
    sessionId: activeSession.id,
    guardId: ahmad.id,
    reportedById: ahmad.user.id,
    type: 'HAZARD',
    description: 'Several cardboard boxes blocking Emergency Exit B1 — partial obstruction. Cleared immediately and reported for follow-up.',
    severity: 'HIGH',
    status: 'OPEN',
    lat: aCheckpoints[5].lat,
    lng: aCheckpoints[5].lng,
    locationLabel: 'Building A – Emergency Exit B1',
    photoUrls: JSON.stringify(['/api/placeholder/incident/blocked-exit']),
    occurredAt: new Date(now.getTime() - 15 * 60 * 1000),
  })
  await db.incident.create({
    sessionId: ySession.id,
    guardId: ahmad.id,
    reportedById: ahmad.user.id,
    type: 'EQUIPMENT',
    description: 'CCTV camera at Roof Access showing intermittent signal loss. Maintenance ticket submitted.',
    severity: 'LOW',
    status: 'RESOLVED',
    lat: aCheckpoints[6].lat,
    lng: aCheckpoints[6].lng,
    locationLabel: 'Building A – Roof Access',
    photoUrls: JSON.stringify([]),
    occurredAt: new Date(yStart.getTime() + 50 * 60 * 1000),
  })

  // ── Emergency Alert (resolved historical) ──
  await db.emergencyAlert.create({
    guardId: raj.id,
    guardUserId: raj.user.id,
    lat: pCheckpoints[1].lat,
    lng: pCheckpoints[1].lng,
    accuracy: 5.1,
    locationLabel: 'Visitor Parking',
    status: 'RESOLVED',
    message: 'SOS triggered — false alarm, guard confirmed safe.',
    acknowledgedAt: new Date(twoStart.getTime() + 22 * 60 * 1000),
    resolvedAt: new Date(twoStart.getTime() + 25 * 60 * 1000),
  })

  // ── Notifications ──
  const notifs = [
    { audience: 'SUPERVISOR', type: 'SOS', title: 'Emergency SOS resolved', message: 'Raj Kumar triggered and resolved SOS at Visitor Parking.', priority: 'HIGH', read: true },
    { audience: 'SUPERVISOR', type: 'MISSED_CHECKPOINT', title: 'Missed Checkpoint Alert', message: 'Guard Raj missed CP04 (Loading Dock) during Perimeter Patrol.', priority: 'HIGH', read: false },
    { audience: 'SUPERVISOR', type: 'SUSPICIOUS', title: 'Suspicious Activity Flagged', message: 'Low GPS accuracy detected at CP02 (Visitor Parking) — flagged for review.', priority: 'NORMAL', read: false },
    { audience: 'SUPERVISOR', type: 'INCIDENT', title: 'Incident Report Submitted', message: 'Ahmad reported a blocked emergency exit at Building A.', priority: 'HIGH', read: false },
    { audience: 'SUPERVISOR', type: 'PATROL_STARTING', title: 'Patrol Starting Soon', message: 'Ahmad Rahman — Building A Night Patrol starts in 10 minutes.', priority: 'NORMAL', read: true },
    { audience: 'GUARD', userId: ahmad.user.id, type: 'PATROL_STARTING', title: 'Patrol Reminder', message: 'Your Building A Night Patrol starts at 10:00 PM. Please be ready.', priority: 'NORMAL', read: true },
    { audience: 'GUARD', userId: siti.user.id, type: 'ANNOUNCEMENT', title: 'New Announcement', message: 'All guards: monthly equipment check on Friday at 8 AM.', priority: 'NORMAL', read: false },
    { audience: 'SUPERVISOR', type: 'PATROL_COMPLETE', title: 'Patrol Completed', message: 'Ahmad completed yesterday\'s Night Patrol — 8/8 checkpoints, no issues.', priority: 'LOW', read: true },
    { audience: 'SUPERVISOR', type: 'LATE_CHECKPOINT', title: 'Late Checkpoint', message: 'CP03 (Reception Desk) verified 4 minutes late by Ahmad.', priority: 'NORMAL', read: false },
    { audience: 'SUPERVISOR', type: 'GUARD_OFFLINE', title: 'Guard Offline', message: 'Tan Wei Ming went offline 12 minutes ago during scheduled rest period.', priority: 'LOW', read: true },
  ]
  for (const n of notifs) {
    await db.notification.create({ ...n })
  }

  // ── Announcements ──
  await db.announcement.create({
    authorId: sup1User.id,
    title: 'Enhanced Checkpoint Verification Now Active',
    body: 'All patrol officers must now capture an in-app photo at each checkpoint. The server validates the timestamp and GPS geofence. Please ensure your device location services are set to high accuracy.',
    audience: 'ALL',
  })
  await db.announcement.create({
    authorId: sup2User.id,
    title: 'Monthly Equipment Inspection – Friday',
    body: 'All guards must report to the equipment room at 08:00 on Friday for uniform and device inspection. Please bring your issued radios and batons.',
    audience: 'GUARD',
  })

  // ── Audit Logs ──
  const auditEntries = [
    { userId: adminUser.id, action: 'USER_LOGIN', entity: 'User', details: 'Administrator signed in', ip: '10.0.0.12' },
    { userId: sup1User.id, action: 'USER_LOGIN', entity: 'User', details: 'Supervisor signed in', ip: '10.0.0.31' },
    { userId: ahmad.user.id, action: 'PATROL_START', entity: 'PatrolSession', entityId: activeSession.id, details: 'Started Night Patrol – Block A', ip: '10.0.20.4', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'CHECKPOINT_VERIFIED', entity: 'CheckpointVerification', details: 'Verified A-CP01 (Main Entrance)', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'CHECKPOINT_VERIFIED', entity: 'CheckpointVerification', details: 'Verified A-CP02 (Ground Lobby)', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'CHECKPOINT_VERIFIED', entity: 'CheckpointVerification', details: 'Verified A-CP03 (Reception Desk) — LATE', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'CHECKPOINT_VERIFIED', entity: 'CheckpointVerification', details: 'Verified A-CP04 (East Stairwell) — safety hazard flagged', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'CHECKPOINT_VERIFIED', entity: 'CheckpointVerification', details: 'Verified A-CP05 (Server Room Door)', deviceInfo: 'Samsung Galaxy A54' },
    { userId: ahmad.user.id, action: 'INCIDENT_SUBMIT', entity: 'Incident', details: 'Reported blocked emergency exit at Building A', deviceInfo: 'Samsung Galaxy A54' },
    { userId: raj.user.id, action: 'SOS_ACTIVATED', entity: 'EmergencyAlert', details: 'SOS activated at Visitor Parking', deviceInfo: 'Xiaomi Redmi Note 12' },
    { userId: raj.user.id, action: 'SOS_RESOLVED', entity: 'EmergencyAlert', details: 'SOS resolved — false alarm', deviceInfo: 'Xiaomi Redmi Note 12' },
    { userId: raj.user.id, action: 'CHECKPOINT_MISSED', entity: 'CheckpointVerification', details: 'Missed CP04 (Loading Dock) — outside time window', deviceInfo: 'Xiaomi Redmi Note 12' },
    { userId: sup1User.id, action: 'SCHEDULE_CREATE', entity: 'PatrolSchedule', details: 'Created Night Patrol – Block A schedule' },
    { userId: sup2User.id, action: 'CHECKPOINT_CREATE', entity: 'Checkpoint', details: 'Created checkpoint B-CP03 (Warehouse Floor)' },
    { userId: adminUser.id, action: 'USER_MODIFY', entity: 'User', details: 'Updated guard Fatima Aisha shift to ROTATING' },
    { userId: ahmad.user.id, action: 'LOGIN_FAILED', entity: 'User', details: 'Failed login attempt (1/5)', ip: '10.0.20.4' },
  ]
  for (let i = 0; i < auditEntries.length; i++) {
    const e = auditEntries[i]
    await db.auditLog.create({
      ...e,
      createdAt: new Date(now.getTime() - (auditEntries.length - i) * 7 * 60 * 1000),
    })
  }

  console.log('✅ Firestore seed complete')
  console.log({
    users: (await db.user.findAll()).length,
    guards: (await db.guard.findAll()).length,
    routes: (await db.patrolRoute.findAll()).length,
    checkpoints: (await db.checkpoint.findAll()).length,
    schedules: (await db.patrolSchedule.findAll()).length,
    sessions: (await db.patrolSession.findAll()).length,
    verifications: (await db.checkpointVerification.findAll()).length,
    incidents: (await db.incident.findAll()).length,
    notifications: (await db.notification.findAll()).length,
    auditLogs: (await db.auditLog.findAll()).length,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
