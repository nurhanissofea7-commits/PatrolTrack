// Shared frontend types for PatrolTrack

export type Role = 'ADMIN' | 'SUPERVISOR' | 'GUARD'
export type GuardStatus = 'ON_PATROL' | 'ON_DUTY' | 'OFF_DUTY' | 'BREAK' | 'EMERGENCY' | 'DELAYED' | 'OFFLINE'
export type PatrolStatus = 'ACTIVE' | 'COMPLETED' | 'COMPLETED_WITH_ISSUES' | 'INCOMPLETE' | 'ABORTED'
export type TimingStatus = 'EARLY' | 'ON_TIME' | 'LATE' | 'MISSED'
export type VerificationStatus = 'VERIFIED' | 'REJECTED' | 'FLAGGED' | 'MISSED'
export type IncidentType = 'THEFT' | 'SUSPICIOUS' | 'DAMAGE' | 'FIRE' | 'ACCIDENT' | 'ACCESS' | 'EQUIPMENT' | 'HAZARD' | 'OTHER'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  guardId?: string | null
  supervisorId?: string | null
}

export interface Guard {
  id: string
  employeeId: string
  name: string
  email: string
  phone?: string | null
  avatarColor: string
  rank: string
  shift: string
  status: string
  isOnline: boolean
  rating: number
  supervisor: { id: string; name: string } | null
  currentLat: number | null
  currentLng: number | null
  currentAccuracy: number | null
  lastLocationAt: string | null
  batteryLevel: number | null
  deviceInfo: string | null
  licenseNumber: string | null
  hireDate: string
  userStatus: string
}

export interface Checkpoint {
  id: string
  code: string
  name: string
  routeId: string
  routeName?: string
  location?: string | null
  lat: number
  lng: number
  radiusM: number
  sequence: number
  expectedWindowMin: number
  description?: string | null
}

export interface PatrolRoute {
  id: string
  name: string
  location: string | null
  startLat: number
  startLng: number
  estimatedDurationMin: number
  estimatedDistanceM: number
  status: string
  description?: string | null
  checkpointCount: number
  checkpoints: Checkpoint[]
  scheduleCount: number
  sessionCount: number
}

export interface Schedule {
  id: string
  name: string
  routeId: string
  routeName: string
  guardId: string | null
  guardName: string | null
  guardColor: string | null
  date: string
  startTime: string
  endTime: string
  frequency: string
  priority: string
  instructions: string | null
  status: string
  checkpointCount: number
  checkpoints: { id: string; code: string; name: string; sequence: number; expectedWindowMin: number }[]
  lastSessionId: string | null
}

export interface Verification {
  id: string
  checkpointId: string
  sequenceOrder: number
  photoUrl: string | null
  capturedAt: string
  serverTimestamp: string
  lat: number
  lng: number
  gpsAccuracy: number
  distanceToCheckpoint: number
  withinGeofence: boolean
  checklist: string
  notes: string | null
  deviceInfo: string | null
  status: VerificationStatus
  rejectionReason: string | null
  timingStatus: TimingStatus
  isOnTime: boolean
  suspicious: boolean
  suspiciousFlags: string | null
}

export interface PatrolSession {
  id: string
  scheduleId: string | null
  scheduleName: string | null
  routeId: string
  routeName: string
  guardId: string
  guardName: string
  guardColor: string
  status: PatrolStatus
  startedAt: string
  endedAt: string | null
  durationMin: number | null
  startLat: number | null
  startLng: number | null
  endLat: number | null
  endLng: number | null
  completedCount: number
  missedCount: number
  lateCount: number
  totalCheckpoints: number
  suspiciousFlags: number
  report: string | null
  notes: string | null
  checkpoints?: Checkpoint[]
  verifications?: Verification[]
  incidents?: { id: string; type: string; severity: string; status: string; description: string }[]
}

export interface Incident {
  id: string
  type: IncidentType
  description: string
  severity: Severity
  status: string
  lat: number | null
  lng: number | null
  locationLabel: string | null
  photoUrls: string[]
  occurredAt: string
  createdAt: string
  guard: { id: string; name: string; color: string } | null
  session: { id: string; routeName: string } | null
}

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  priority: string
  read: boolean
  audience: string
  relatedId: string | null
  createdAt: string
}

export interface Announcement {
  id: string
  authorId: string
  authorName: string
  title: string
  body: string
  audience: string
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string | null
  userName: string
  action: string
  entity: string | null
  entityId: string | null
  details: string | null
  ip: string | null
  deviceInfo: string | null
  createdAt: string
}

export interface DashboardStats {
  guardsOnDuty: number
  guardsOnPatrol: number
  totalGuards: number
  activePatrols: number
  completedPatrols: number
  missedCheckpoints: number
  lateCheckpoints: number
  flaggedSubmissions: number
  openIncidents: number
  activeEmergencies: number
  scheduledToday: number
  verification: {
    trueAcceptance: number
    trueRejection: number
    falseAcceptance: number
    falseRejection: number
    total: number
    successRate: number
  }
}

export interface LiveGuard {
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
