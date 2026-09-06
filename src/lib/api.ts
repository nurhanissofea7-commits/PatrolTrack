// Frontend API helpers
import type {
  Guard, PatrolRoute, Checkpoint, Schedule, PatrolSession,
  Incident, AppNotification, Announcement, AuditLog, DashboardStats, SessionUser,
} from './types'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data as { error?: string })?.error || `POST ${url} failed: ${res.status}`)
  return data as T
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data as { error?: string })?.error || `PATCH ${url} failed: ${res.status}`)
  return data as T
}

export const api = {
  // auth
  login: (email: string, password: string) => post<{ user: SessionUser }>('/api/auth/login', { email, password }),
  logout: () => post('/api/auth/logout'),
  me: () => get<{ user: SessionUser }>('/api/auth/me'),

  // dashboard
  dashboard: () => get<DashboardStats>('/api/dashboard'),

  // guards
  guards: () => get<{ guards: Guard[] }>('/api/guards'),
  guard: (id: string) => get<{ guard: Guard; sessions: PatrolSession[]; incidents: Incident[]; patrolStats: { total: number; completed: number; withIssues: number; active: number; avgRating: number } }>(`/api/guards/${id}`),

  // routes
  routes: () => get<{ routes: PatrolRoute[] }>('/api/routes'),

  // checkpoints
  checkpoints: (routeId?: string) => get<{ checkpoints: Checkpoint[] }>(`/api/checkpoints${routeId ? `?routeId=${routeId}` : ''}`),

  // schedules
  schedules: () => get<{ schedules: Schedule[] }>('/api/schedules'),
  createSchedule: (body: Partial<Schedule>) => post('/api/schedules', body),

  // patrols
  patrols: (guardId?: string, status?: string) =>
    get<{ sessions: PatrolSession[] }>(`/api/patrols${[guardId && `guardId=${guardId}`, status && `status=${status}`].filter(Boolean).length ? '?' + [guardId && `guardId=${guardId}`, status && `status=${status}`].filter(Boolean).join('&') : ''}`),
  patrol: (id: string) => get<{ session: PatrolSession & { checkpoints: (Checkpoint & { verification: Verification | null })[] } }>(`/api/patrols/${id}`),
  startPatrol: (body: { scheduleId?: string; routeId: string; guardId?: string; startLat?: number; startLng?: number }) =>
    post<{ session: PatrolSession & { checkpoints: Checkpoint[] } }>('/api/patrols/start', body),
  endPatrol: (id: string, body: { endLat?: number; endLng?: number; notes?: string }) =>
    post<{ session: PatrolSession; report: string; status: string }>(`/api/patrols/${id}/end`, body),

  // verifications
  submitVerification: (body: {
    sessionId: string
    checkpointId: string
    photo: string
    lat: number
    lng: number
    gpsAccuracy: number
    clientTimestamp: string
    checklist: { q: string; a: string; critical?: boolean }[]
    notes?: string
    deviceInfo?: string
  }) => post<{
    status: string
    reason: string | null
    timingStatus: string
    distance: number
    withinGeofence: boolean
    flags: string[]
    verification: { id: string }
    checkpoint: { code: string; name: string; sequence: number }
  }>('/api/verifications', body),

  // incidents
  incidents: (status?: string, guardId?: string) =>
    get<{ incidents: Incident[] }>(`/api/incidents${[status && `status=${status}`, guardId && `guardId=${guardId}`].filter(Boolean).length ? '?' + [status && `status=${status}`, guardId && `guardId=${guardId}`].filter(Boolean).join('&') : ''}`),
  updateIncident: (id: string, status: string) => patch(`/api/incidents/${id}`, { status }),

  // notifications
  notifications: () => get<{ notifications: AppNotification[] }>('/api/notifications'),
  markRead: (id: string) => patch(`/api/notifications/${id}/read`),

  // emergency
  emergency: () => get<{ alerts: { id: string; guardId: string; guardName: string; lat: number; lng: number; accuracy: number; locationLabel: string | null; status: string; message: string | null; acknowledgedAt: string | null; resolvedAt: string | null; createdAt: string }[] }>('/api/emergency'),
  activateSOS: (body: { lat: number; lng: number; accuracy: number; locationLabel?: string; message?: string }) =>
    post<{ alert: { id: string } }>('/api/emergency', body),

  // audit
  audit: () => get<{ logs: AuditLog[] }>('/api/audit'),

  // analytics
  analytics: () => get<{
    summary: { completionRate: number; verificationSuccessRate: number; missedRate: number; lateRate: number; avgDurationMin: number; incidentCount: number; complianceRate: number }
    sessions: { completed: number; withIssues: number; incomplete: number }
    verifications: { verified: number; rejected: number; flagged: number; missed: number; late: number; total: number }
    guardPerformance: { name: string; color: string; patrols: number; completed: number; checkpoints: number; incidents: number }[]
    daily: { date: string; patrols: number; incidents: number }[]
    incidentTypes: Record<string, number>
  }>('/api/analytics'),

  // announcements
  announcements: () => get<{ announcements: Announcement[] }>('/api/announcements'),
  createAnnouncement: (body: { title: string; body: string; audience: string }) => post('/api/announcements', body),

  // settings
  settings: () => get<{ settings: Record<string, string> }>('/api/settings'),
  updateSettings: (body: Record<string, string>) => patch('/api/settings', body),
}

// Re-export Verification type for the api.patrol return
import type { Verification } from './types'
