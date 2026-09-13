'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CameraCapture } from './camera-capture'
import { LiveMap } from './live-map'
import { GuardAvatar } from './guard-avatar'
import { StatusBadge, PriorityBadge } from './status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  Home, MapPinned, History, Bell, User as UserIcon, Siren, Camera, CheckCircle2,
  ChevronRight, X, AlertTriangle, Wifi, BatteryMedium, Radio, Clock, ShieldCheck,
  Navigation, ChevronLeft, Plus, Activity, WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Guard, Checkpoint, PatrolSession, IncidentType } from '@/lib/types'

type Tab = 'home' | 'patrol' | 'history' | 'notifications' | 'profile'

const SAFETY_CHECKLIST = [
  { q: 'Is the area clear of obstructions?', critical: true },
  { q: 'Is the emergency exit accessible?', critical: true },
  { q: 'Is the lighting functioning properly?', critical: false },
  { q: 'Is the security equipment in normal condition?', critical: false },
  { q: 'Is there any suspicious activity?', critical: true },
  { q: 'Are there any safety hazards?', critical: true },
]

export function GuardMode({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = React.useState<Tab>('home')
  const [guardId, setGuardId] = React.useState<string | null>(null)
  const qc = useQueryClient()

  const { data: guardsData } = useQuery({ queryKey: ['guards'], queryFn: api.guards })
  const guards = guardsData?.guards ?? []
  React.useEffect(() => {
    if (!guardId && guards.length) {
      // default to Ahmad (the one on patrol) if available
      const onPatrol = guards.find((g) => g.status === 'ON_PATROL')
      setGuardId(onPatrol?.id ?? guards[0].id)
    }
  }, [guards, guardId])

  const guard = guards.find((g) => g.id === guardId) ?? null

  // Active patrol for this guard
  const { data: activeData } = useQuery({
    queryKey: ['patrols', 'active', guardId],
    queryFn: () => api.patrols(guardId ?? undefined, 'ACTIVE'),
    enabled: !!guardId,
  })
  const activeSession = activeData?.sessions?.[0] ?? null

  // Full session detail (for checkpoints + verifications)
  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ['patrol', activeSession?.id],
    queryFn: () => api.patrol(activeSession!.id),
    enabled: !!activeSession,
  })
  const fullSession = sessionData?.session ?? null

  // Schedules for this guard
  const { data: schedData } = useQuery({ queryKey: ['schedules'], queryFn: api.schedules })
  const mySchedules = (schedData?.schedules ?? []).filter((s) => s.guardId === guardId)

  // History
  const { data: historyData } = useQuery({
    queryKey: ['patrols', 'all', guardId],
    queryFn: () => api.patrols(guardId ?? undefined),
    enabled: !!guardId,
  })
  const history = (historyData?.sessions ?? []).filter((s) => s.status !== 'ACTIVE')

  // Notifications
  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications })
  const notifications = notifData?.notifications ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-0 sm:p-6 backdrop-blur-sm">
      {/* Close button */}
      <button onClick={onClose} className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6 sm:top-6">
        <X className="h-5 w-5" />
      </button>

      {/* Phone frame */}
      <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 sm:h-[860px] sm:max-h-[92vh] sm:rounded-[2.5rem] sm:border-8 sm:border-slate-800 sm:shadow-2xl">
        {/* Notch (desktop only) */}
        <div className="absolute left-1/2 top-0 z-30 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-800 sm:block" />

        {/* Status bar */}
        <PhoneStatusBar guard={guard} />

        {/* Guard selector */}
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500">Simulating as:</span>
          <Select value={guardId ?? ''} onValueChange={setGuardId}>
            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select guard" /></SelectTrigger>
            <SelectContent>
              {guards.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full', g.status === 'ON_PATROL' ? 'bg-emerald-500' : g.status === 'ON_DUTY' ? 'bg-sky-500' : 'bg-slate-300')} />
                    {g.name} · {g.status.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 pb-24">
              {tab === 'home' && guard && (
                <GuardHome guard={guard} activeSession={activeSession} fullSession={fullSession} mySchedules={mySchedules} onStartPatrol={() => setTab('patrol')} />
              )}
              {tab === 'patrol' && guard && (
                <GuardPatrol
                  guard={guard}
                  activeSession={activeSession}
                  fullSession={fullSession}
                  onSessionChanged={() => { refetchSession(); qc.invalidateQueries({ queryKey: ['patrols'] }) }}
                />
              )}
              {tab === 'history' && <GuardHistory sessions={history} />}
              {tab === 'notifications' && <GuardNotifications notifications={notifications} />}
              {tab === 'profile' && guard && <GuardProfile guard={guard} />}
            </div>
          </ScrollArea>
        </div>

        {/* Bottom nav */}
        <nav className="flex items-center justify-around border-t border-slate-200/70 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
          <NavBtn icon={Home} label="Home" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavBtn icon={MapPinned} label="Patrol" active={tab === 'patrol'} onClick={() => setTab('patrol')} badge={activeSession ? 'active' : undefined} />
          <NavBtn icon={History} label="History" active={tab === 'history'} onClick={() => setTab('history')} />
          <NavBtn icon={Bell} label="Alerts" active={tab === 'notifications'} onClick={() => setTab('notifications')} badge={notifications.filter((n) => !n.read).length > 0 ? String(notifications.filter((n) => !n.read).length) : undefined} />
          <NavBtn icon={UserIcon} label="Profile" active={tab === 'profile'} onClick={() => setTab('profile')} />
        </nav>
      </div>
    </div>
  )
}

// ─── Phone status bar ───────────────────────────────────────────────────────
function PhoneStatusBar({ guard }: { guard: Guard | null }) {
  const [time, setTime] = React.useState('')
  const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  React.useEffect(() => {
    const tick = () => setTime(format(new Date(), 'HH:mm'))
    tick()
    const i = setInterval(tick, 30000)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { clearInterval(i); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return (
    <div className="flex items-center justify-between bg-slate-900 px-5 py-1.5 text-[11px] font-medium text-white">
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        {online ? (
          <span className="flex items-center gap-0.5 text-emerald-400"><Wifi className="h-3 w-3" /></span>
        ) : (
          <span className="flex items-center gap-0.5 text-amber-400"><WifiOff className="h-3 w-3" />Offline</span>
        )}
        {guard?.batteryLevel != null && (
          <span className="flex items-center gap-0.5"><BatteryMedium className="h-3 w-3" />{guard.batteryLevel}%</span>
        )}
      </div>
    </div>
  )
}

function NavBtn({ icon: Icon, label, active, onClick, badge }: {
  icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void; badge?: string
}) {
  return (
    <button onClick={onClick} className={cn('relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {badge && (
        <span className={cn('absolute right-2 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold', badge === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>{badge}</span>
      )}
    </button>
  )
}

// ─── Home screen ────────────────────────────────────────────────────────────
function GuardHome({ guard, activeSession, fullSession, mySchedules, onStartPatrol }: {
  guard: Guard; activeSession: PatrolSession | null; fullSession: any; mySchedules: any[]; onStartPatrol: () => void
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const completed = fullSession?.checkpoints?.filter((c: any) => c.verification && (c.verification.status === 'VERIFIED' || c.verification.status === 'FLAGGED')).length ?? activeSession?.completedCount ?? 0
  const total = fullSession?.checkpoints?.length ?? activeSession?.totalCheckpoints ?? 0
  const progress = total ? Math.round((completed / total) * 100) : 0
  const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  React.useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <div className="space-y-4">
      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span><strong>Offline Mode.</strong> Records are stored locally and will sync automatically when connection returns.</span>
        </div>
      )}

      {/* Greeting */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <GuardAvatar name={guard.name} color={guard.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-emerald-300">{greeting}</p>
            <p className="truncate font-semibold">{guard.name}</p>
          </div>
          <StatusBadge status={guard.status} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-300">
          {online ? (
            <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-emerald-400" /> Online</span>
          ) : (
            <span className="flex items-center gap-1"><WifiOff className="h-3 w-3 text-amber-400" /> Offline</span>
          )}
          <span className="flex items-center gap-1"><Radio className="h-3 w-3 text-emerald-400" /> GPS ±{(guard.currentAccuracy ?? 6.4).toFixed(1)}m</span>
          {guard.batteryLevel != null && <span className="flex items-center gap-1"><BatteryMedium className="h-3 w-3 text-emerald-400" /> {guard.batteryLevel}%</span>}
        </div>
      </div>

      {/* Active patrol card */}
      {activeSession ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current Patrol</p>
            <StatusBadge status="ON_PATROL" />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{activeSession.routeName}</p>
          <p className="text-xs text-slate-500">Started {formatDistanceToNow(new Date(activeSession.startedAt), { addSuffix: true })}</p>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Progress</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{completed}/{total} · {progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
          <Button onClick={onStartPatrol} className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700">
            <Navigation className="mr-1.5 h-4 w-4" /> Continue Patrol
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">No Active Patrol</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">You have no patrol in progress. Check the Patrol tab to start one.</p>
          <Button onClick={onStartPatrol} className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-1.5 h-4 w-4" /> Start Patrol
          </Button>
        </div>
      )}

      {/* Upcoming schedule */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Upcoming Schedules</p>
        {mySchedules.length === 0 ? (
          <p className="rounded-xl border border-slate-200/70 bg-white p-3 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">No upcoming schedules.</p>
        ) : (
          <div className="space-y-2">
            {mySchedules.slice(0, 3).map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <PriorityBadge priority={s.priority} />
                </div>
                <p className="text-xs text-slate-500">{s.routeName}</p>
                <p className="mt-1 text-[11px] text-slate-400">{format(new Date(s.startTime), 'dd MMM, HH:mm')} → {format(new Date(s.endTime), 'HH:mm')}</p>
                {s.instructions && <p className="mt-1 line-clamp-2 text-[11px] text-amber-700 dark:text-amber-300">📋 {s.instructions}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Duty Status" value={guard.status.replace(/_/g, ' ')} />
        <MiniStat label="Rating" value={`${guard.rating.toFixed(1)}/5`} />
      </div>
    </div>
  )
}

// ─── Patrol screen ──────────────────────────────────────────────────────────
function GuardPatrol({ guard, activeSession, fullSession, onSessionChanged }: {
  guard: Guard; activeSession: PatrolSession | null; fullSession: any; onSessionChanged: () => void
}) {
  const qc = useQueryClient()
  const [capturing, setCapturing] = React.useState<string | null>(null) // checkpointId being captured
  const [showIncident, setShowIncident] = React.useState(false)
  const [showStart, setShowStart] = React.useState(false)

  const startMutation = useMutation({
    mutationFn: (routeId: string) => api.startPatrol({ routeId, guardId: guard.id }),
    onSuccess: () => {
      toast.success('Patrol started — GPS tracking active')
      onSessionChanged()
      setShowStart(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const endMutation = useMutation({
    mutationFn: () => api.endPatrol(activeSession!.id, {}),
    onSuccess: () => {
      toast.success('Patrol ended — report generated')
      onSessionChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const checkpoints = (fullSession?.checkpoints ?? []) as (Checkpoint & { verification: any })[]
  const completed = checkpoints.filter((c) => c.verification && (c.verification.status === 'VERIFIED' || c.verification.status === 'FLAGGED')).length
  const total = checkpoints.length
  const progress = total ? Math.round((completed / total) * 100) : 0
  const nextCheckpoint = checkpoints.find((c) => !c.verification || (c.verification.status !== 'VERIFIED' && c.verification.status !== 'FLAGGED'))

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Start a Patrol</p>
        <p className="text-sm text-slate-500">Select a patrol route to begin your shift. GPS tracking activates automatically.</p>
        <StartPatrolSheet open={showStart} onOpenChange={setShowStart} guardId={guard.id} onStarted={() => onSessionChanged()} />
        <Button onClick={() => setShowStart(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1.5 h-4 w-4" /> Choose Route & Start
        </Button>

        {/* Incident without active patrol */}
        <Button variant="outline" onClick={() => setShowIncident(true)} className="w-full">
          <AlertTriangle className="mr-1.5 h-4 w-4" /> Report Incident
        </Button>
        <IncidentSheet open={showIncident} onOpenChange={setShowIncident} guardId={guard.id} sessionId={null} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* SOS button - always visible during patrol */}
      <SOSButton guard={guard} />

      {/* Patrol header */}
      <div className="rounded-2xl border border-emerald-500/30 bg-white p-4 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Patrol</p>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{progress}%</Badge>
        </div>
        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{activeSession.routeName}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-emerald-500" /> GPS Live</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(activeSession.startedAt), { addSuffix: true })}</span>
        </div>
        <Progress value={progress} className="mt-3 h-2.5" />
        <p className="mt-1 text-center text-xs text-slate-500">{completed} / {total} checkpoints completed</p>
      </div>

      {/* Mini map */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
        <LiveMap
          checkpoints={checkpoints}
          liveGuards={[{
            guardId: guard.id,
            guardName: guard.name,
            lat: guard.currentLat ?? checkpoints[0]?.lat ?? 3.139,
            lng: guard.currentLng ?? checkpoints[0]?.lng ?? 101.6869,
            accuracy: guard.currentAccuracy ?? 6,
            status: guard.status,
            patrolId: activeSession.id,
            routeName: activeSession.routeName,
            battery: guard.batteryLevel ?? 80,
            lastUpdate: Date.now(),
          }]}
          verifiedCheckpointIds={new Set(checkpoints.filter((c) => c.verification && (c.verification.status === 'VERIFIED' || c.verification.status === 'FLAGGED')).map((c) => c.id))}
          currentCheckpointId={nextCheckpoint?.id}
          interactive={false}
          className="h-[220px]"
        />
      </div>

      {/* Checkpoint list */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Checkpoints</p>
        <div className="space-y-2">
          {checkpoints.map((c) => {
            const v = c.verification
            const isDone = v && (v.status === 'VERIFIED' || v.status === 'FLAGGED')
            const isNext = nextCheckpoint?.id === c.id
            return (
              <div key={c.id} className={cn(
                'rounded-xl border p-3',
                isDone ? 'border-emerald-500/30 bg-emerald-500/5' : isNext ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-500/5' : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900'
              )}>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isDone ? 'bg-emerald-500 text-white' : isNext ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                  )}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : c.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.code} · {c.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {isDone ? `Verified · ${format(new Date(v.capturedAt), 'HH:mm')}` : isNext ? 'Tap to verify' : 'Pending'}
                    </p>
                  </div>
                  {isNext && (
                    <Button size="sm" onClick={() => setCapturing(c.id)} className="bg-amber-500 hover:bg-amber-600 text-white">
                      <Camera className="mr-1 h-3.5 w-3.5" /> Verify
                    </Button>
                  )}
                </div>
                {v && v.notes && <p className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">📝 {v.notes}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setShowIncident(true)}>
          <AlertTriangle className="mr-1.5 h-4 w-4" /> Report Incident
        </Button>
        <Button onClick={() => endMutation.mutate()} disabled={endMutation.isPending} className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700">
          End Patrol
        </Button>
      </div>

      {/* Capture flow */}
      <CheckpointCaptureSheet
        open={!!capturing}
        onOpenChange={(o) => !o && setCapturing(null)}
        checkpoint={checkpoints.find((c) => c.id === capturing) ?? null}
        sessionId={activeSession.id}
        onSubmitted={() => {
          setCapturing(null)
          onSessionChanged()
        }}
      />

      <IncidentSheet open={showIncident} onOpenChange={setShowIncident} guardId={guard.id} sessionId={activeSession.id} />
    </div>
  )
}

// ─── SOS Button ─────────────────────────────────────────────────────────────
function SOSButton({ guard }: { guard: Guard }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [holding, setHolding] = React.useState(false)
  const [holdProgress, setHoldProgress] = React.useState(0)
  const timerRef = React.useRef<any>(null)

  const activate = useMutation({
    mutationFn: async () => {
      const pos = await getPosition()
      return api.activateSOS({ ...pos, guardId: guard.id, locationLabel: 'Building A — Parking Area', message: `SOS activated by ${guard.name}` })
    },
    onSuccess: () => {
      toast.error('🚨 EMERGENCY SOS ACTIVATED — Supervisor notified')
      setConfirmOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const startHold = () => {
    setHolding(true)
    setHoldProgress(0)
    let p = 0
    timerRef.current = setInterval(() => {
      p += 4
      setHoldProgress(p)
      if (p >= 100) {
        clearInterval(timerRef.current)
        activate.mutate()
        setHolding(false)
        setHoldProgress(0)
      }
    }, 50)
  }
  const cancelHold = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setHolding(false)
    setHoldProgress(0)
  }

  return (
    <>
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 p-4 text-white shadow-lg shadow-rose-500/30 active:scale-[0.98] transition-transform"
      >
        {!holding && (
          <div className="absolute inset-0 animate-pulse bg-rose-500/20" />
        )}
        {holding && (
          <div className="absolute inset-y-0 left-0 bg-rose-900/50" style={{ width: `${holdProgress}%` }} />
        )}
        <Siren className="relative h-6 w-6" />
        <span className="relative text-base font-bold tracking-wide">EMERGENCY SOS</span>
      </button>
      <p className="text-center text-[10px] text-slate-400">Hold to activate · Supervisor will be alerted</p>

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent className="max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-rose-600">Confirm Emergency</SheetTitle>
            <SheetDescription>This will alert all supervisors with your live location.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => activate.mutate()} disabled={activate.isPending}>
              <Siren className="mr-1.5 h-4 w-4" /> Activate SOS
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Checkpoint capture sheet ───────────────────────────────────────────────
function CheckpointCaptureSheet({ open, onOpenChange, checkpoint, sessionId, onSubmitted }: {
  open: boolean; onOpenChange: (o: boolean) => void; checkpoint: any; sessionId: string; onSubmitted: () => void
}) {
  const [step, setStep] = React.useState<'camera' | 'checklist' | 'submitting' | 'result'>('camera')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Record<number, string>>({})
  const [notes, setNotes] = React.useState('')
  const [result, setResult] = React.useState<any>(null)
  const [gps, setGps] = React.useState<{ lat: number; lng: number; accuracy: number } | null>(null)

  React.useEffect(() => {
    if (open) {
      setStep('camera'); setPhoto(null); setAnswers({}); setNotes(''); setResult(null); setGps(null)
      // In simulation mode, place the guard at the checkpoint (with a small offset within the geofence)
      // so the verification succeeds — real geofence rejections are shown via the seeded data.
      getPositionNearCheckpoint(checkpoint).then(setGps)
    }
  }, [open, checkpoint])

  const submit = useMutation({
    mutationFn: () => api.submitVerification({
      sessionId,
      checkpointId: checkpoint.id,
      photo: photo ?? 'captured',
      lat: gps!.lat,
      lng: gps!.lng,
      gpsAccuracy: gps!.accuracy,
      clientTimestamp: new Date().toISOString(),
      checklist: SAFETY_CHECKLIST.map((c, i) => ({ q: c.q, a: answers[i] ?? '', critical: c.critical })),
      notes: notes || undefined,
      deviceInfo: navigator.userAgent.slice(0, 80),
    }),
    onSuccess: (r) => { setResult(r); setStep('result') },
    onError: (e: Error) => { setResult({ status: 'REJECTED', reason: e.message }); setStep('result') },
  })

  if (!checkpoint) return null

  const allAnswered = SAFETY_CHECKLIST.every((_, i) => answers[i])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[400px] sm:max-w-[400px] p-0 overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            {step === 'camera' && <><ChevronLeft className="h-4 w-4" /> Capture Checkpoint Photo</>}
            {step === 'checklist' && <><ChevronLeft className="h-4 w-4" /> Safety Checklist</>}
            {step === 'submitting' && 'Submitting Verification'}
            {step === 'result' && 'Verification Result'}
          </SheetTitle>
          <SheetDescription className="text-xs">{checkpoint.code} · {checkpoint.name}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {step === 'camera' && (
            <div className="space-y-3">
              <CameraCapture checkpointCode={checkpoint.code} onCapture={(p) => { setPhoto(p); setStep('checklist') }} />
              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500 dark:bg-slate-800/50">
                <p className="font-medium text-slate-600 dark:text-slate-300">📷 Photo is timestamped server-side</p>
                <p>Changing your phone clock won't alter the verified time.</p>
              </div>
            </div>
          )}

          {step === 'checklist' && (
            <div className="space-y-3">
              {photo && <img src={photo} alt="captured" className="h-32 w-full rounded-lg object-cover" />}
              <div className="space-y-2">
                {SAFETY_CHECKLIST.map((c, i) => (
                  <div key={i} className="rounded-lg border border-slate-200/70 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.q} {c.critical && <span className="text-rose-500">*</span>}</p>
                    <div className="mt-1.5 flex gap-2">
                      {['Yes', 'No', 'Normal', 'Abnormal'].slice(0, i < 2 || i === 4 ? 2 : 2).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers({ ...answers, [i]: opt })}
                          className={cn(
                            'flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                            answers[i] === opt
                              ? (opt === 'Yes' || opt === 'Normal' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300')
                              : 'border-slate-200 text-slate-500 dark:border-slate-700'
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Textarea placeholder="Add observations / notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button onClick={() => { setStep('submitting'); submit.mutate() }} disabled={!allAnswered || submit.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> {submit.isPending ? 'Submitting...' : 'Submit Verification'}
              </Button>
              {!allAnswered && <p className="text-center text-[10px] text-amber-600">Answer all checklist questions to submit</p>}
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
              <p className="text-sm text-slate-500">Validating photo, GPS & timestamp...</p>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-3">
              <div className={cn(
                'rounded-xl p-4 text-center',
                result.status === 'VERIFIED' ? 'bg-emerald-500/10' : result.status === 'FLAGGED' ? 'bg-amber-500/10' : 'bg-rose-500/10'
              )}>
                {result.status === 'VERIFIED' ? (
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                ) : result.status === 'FLAGGED' ? (
                  <ShieldCheck className="mx-auto h-12 w-12 text-amber-500" />
                ) : (
                  <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
                )}
                <p className={cn('mt-2 text-lg font-bold', result.status === 'VERIFIED' ? 'text-emerald-700 dark:text-emerald-300' : result.status === 'FLAGGED' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300')}>
                  {result.status === 'VERIFIED' ? 'Checkpoint Verified' : result.status === 'FLAGGED' ? 'Verified — Flagged for Review' : 'Verification Failed'}
                </p>
                {result.reason && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{result.reason}</p>}
              </div>
              {gps && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                  <div className="flex justify-between"><span className="text-slate-500">Distance to CP</span><span className="font-medium">{result.distance}m</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GPS Accuracy</span><span className="font-medium">±{gps.accuracy.toFixed(1)}m</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Timing</span><span className="font-medium">{result.timingStatus}</span></div>
                  {result.flags?.length > 0 && <div className="flex justify-between"><span className="text-slate-500">Flags</span><span className="font-medium text-amber-600">{result.flags.join(', ')}</span></div>}
                </div>
              )}
              <Button onClick={onSubmitted} className="w-full bg-emerald-600 hover:bg-emerald-700">Continue Patrol</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Incident sheet ─────────────────────────────────────────────────────────
const INCIDENT_TYPES: IncidentType[] = ['THEFT', 'SUSPICIOUS', 'DAMAGE', 'FIRE', 'ACCIDENT', 'ACCESS', 'EQUIPMENT', 'HAZARD', 'OTHER']
function IncidentSheet({ open, onOpenChange, guardId, sessionId }: { open: boolean; onOpenChange: (o: boolean) => void; guardId: string; sessionId: string | null }) {
  const [type, setType] = React.useState<IncidentType>('SUSPICIOUS')
  const [description, setDescription] = React.useState('')
  const [severity, setSeverity] = React.useState('MEDIUM')

  const submit = useMutation({
    mutationFn: async () => {
      const pos = await getPosition().catch(() => ({ lat: 3.139, lng: 101.6869, accuracy: 6 }))
      const res = await fetch('/api/incidents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardId, sessionId, type, description, severity, lat: pos.lat, lng: pos.lng, locationLabel: 'Patrol area', photoUrls: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to submit')
      return data
    },
    onSuccess: () => {
      toast.success('Incident report submitted')
      onOpenChange(false)
      setDescription('')
    },
    onError: () => toast.error('Failed to submit'),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[400px] sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Report Incident</SheetTitle>
          <SheetDescription>Report a safety or security incident.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Incident Type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {INCIDENT_TYPES.map((t) => (
                <button key={t} onClick={() => setType(t)} className={cn('rounded-md border px-2 py-1.5 text-[11px] font-medium', type === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 text-slate-500 dark:border-slate-700')}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Severity</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={cn('rounded-md border px-2 py-1.5 text-[11px] font-medium', severity === s ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe what happened..." />
          </div>
          <Button onClick={() => submit.mutate()} disabled={!description || submit.isPending} className="w-full bg-amber-600 hover:bg-amber-700">
            {submit.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Start patrol sheet ──────────────────────────────────────────────────────
function StartPatrolSheet({ open, onOpenChange, guardId, onStarted }: { open: boolean; onOpenChange: (o: boolean) => void; guardId: string; onStarted: () => void }) {
  const { data: routesData } = useQuery({ queryKey: ['routes'], queryFn: api.routes })
  const routes = routesData?.routes ?? []
  const [routeId, setRouteId] = React.useState('')

  const start = useMutation({
    mutationFn: () => api.startPatrol({ routeId, guardId }),
    onSuccess: () => { toast.success('Patrol started'); onStarted(); onOpenChange(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Start New Patrol</SheetTitle>
          <SheetDescription>Select a patrol route to begin.</SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-6">
          {routes.map((r) => (
            <button key={r.id} onClick={() => setRouteId(r.id)} className={cn('w-full rounded-xl border p-3 text-left', routeId === r.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700')}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
              <p className="text-[11px] text-slate-400">{r.checkpointCount} checkpoints · ~{r.estimatedDurationMin} min</p>
            </button>
          ))}
          <Button onClick={() => start.mutate()} disabled={!routeId || start.isPending} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700">
            {start.isPending ? 'Starting...' : 'Start Patrol'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── History / Notifications / Profile ───────────────────────────────────────
function GuardHistory({ sessions }: { sessions: PatrolSession[] }) {
  if (sessions.length === 0) return <p className="py-12 text-center text-sm text-slate-400">No patrol history yet.</p>
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patrol History</p>
      {sessions.map((s) => (
        <div key={s.id} className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.routeName}</p>
            <Badge variant="outline" className="text-[10px]">{s.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-[11px] text-slate-400">{format(new Date(s.startedAt), 'dd MMM, HH:mm')}{s.durationMin && ` · ${s.durationMin} min`}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600">{s.completedCount} ✓</span>
            {s.missedCount > 0 && <span className="text-rose-600">{s.missedCount} ✗</span>}
            {s.lateCount > 0 && <span className="text-amber-600">{s.lateCount} late</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function GuardNotifications({ notifications }: { notifications: any[] }) {
  const unread = notifications.filter((n) => !n.read).length
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notifications {unread > 0 && <span className="text-rose-500">({unread} unread)</span>}</p>
      {notifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No notifications.</p> : (
        notifications.slice(0, 15).map((n) => (
          <div key={n.id} className={cn('rounded-xl border p-3', !n.read ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900')}>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{n.message}</p>
            <p className="mt-1 text-[10px] text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
          </div>
        ))
      )}
    </div>
  )
}

function GuardProfile({ guard }: { guard: Guard }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-900 p-5 text-white">
        <GuardAvatar name={guard.name} color={guard.avatarColor} size="lg" />
        <p className="font-bold">{guard.name}</p>
        <p className="text-xs text-slate-300">{guard.rank} · {guard.employeeId}</p>
        <StatusBadge status={guard.status} />
      </div>
      <div className="space-y-2">
        <ProfileRow icon={Activity} label="Shift" value={guard.shift} />
        <ProfileRow icon={ShieldCheck} label="Rating" value={`${guard.rating.toFixed(1)} / 5.0`} />
        <ProfileRow icon={UserIcon} label="Supervisor" value={guard.supervisor?.name ?? '—'} />
        <ProfileRow icon={Radio} label="License" value={guard.licenseNumber ?? '—'} />
        <ProfileRow icon={Clock} label="Hired" value={format(new Date(guard.hireDate), 'dd MMM yyyy')} />
        <ProfileRow icon={Activity} label="Device" value={guard.deviceInfo ?? '—'} />
      </div>
    </div>
  )
}
function ProfileRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="flex-1 text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────
function getPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: 3.1395, lng: 101.6872, accuracy: 6 })
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve({ lat: 3.1395, lng: 101.6872, accuracy: 6 }),
      { timeout: 4000 }
    )
  })
}

// Returns a GPS position near the given checkpoint (within its geofence radius),
// so the simulated guard verification succeeds. Adds small jitter for realism.
function getPositionNearCheckpoint(checkpoint: any): Promise<{ lat: number; lng: number; accuracy: number }> {
  const baseLat = checkpoint?.lat ?? 3.139
  const baseLng = checkpoint?.lng ?? 101.6869
  // Offset ~8 meters in a random direction (well within the 20m geofence)
  const angle = Math.random() * 2 * Math.PI
  const dLat = (Math.cos(angle) * 8) / 111111
  const dLng = (Math.sin(angle) * 8) / (111111 * Math.cos((baseLat * Math.PI) / 180))
  return Promise.resolve({
    lat: baseLat + dLat,
    lng: baseLng + dLng,
    accuracy: 4 + Math.random() * 4,
  })
}
