'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, ClipboardCheck, CheckCircle2, AlertTriangle, Siren, CalendarClock, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { StatCard, SectionCard, LoadingState } from '../shared'
import { LiveMap } from '../live-map'
import { GuardAvatar } from '../guard-avatar'
import { StatusBadge } from '../status-badges'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import type { DashboardStats, PatrolSession, AppNotification } from '@/lib/types'

export function DashboardView({ liveGuards, onSelectGuard, onNavigate }: {
  liveGuards: any[]
  onSelectGuard: (id: string) => void
  onNavigate: (v: 'live' | 'patrols' | 'incidents' | 'analytics') => void
}) {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })
  const { data: patrolsData } = useQuery({ queryKey: ['patrols', 'active'], queryFn: () => api.patrols(undefined, 'ACTIVE') })
  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications })

  const activePatrols = patrolsData?.sessions ?? []
  const notifications = (notifData?.notifications ?? []).slice(0, 6)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Greeting banner */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">Operations Dashboard</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Sentinel Security — Live Operations</h2>
            <p className="mt-1 text-sm text-slate-300">Real-time guard tracking, checkpoint verification and incident monitoring across all sites.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-2xl font-bold text-emerald-400">{stats?.guardsOnPatrol ?? '—'}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-300">On Patrol</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-2xl font-bold text-sky-400">{stats?.guardsOnDuty ?? '—'}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-300">On Duty</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-2xl font-bold text-rose-400">{stats?.activeEmergencies ?? '0'}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-300">Emergencies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)
        ) : (
          <>
            <StatCard label="Guards On Duty" value={stats?.guardsOnDuty ?? 0} sub={`of ${stats?.totalGuards ?? 0} total`} icon={Users} tone="sky" />
            <StatCard label="Active Patrols" value={stats?.activePatrols ?? 0} sub={`${stats?.completedPatrols ?? 0} completed`} icon={ClipboardCheck} tone="emerald" />
            <StatCard label="Completed Patrols" value={stats?.completedPatrols ?? 0} sub="past sessions" icon={CheckCircle2} tone="emerald" />
            <StatCard label="Missed Checkpoints" value={stats?.missedCheckpoints ?? 0} sub={`${stats?.lateCheckpoints ?? 0} late`} icon={AlertTriangle} tone="amber" />
            <StatCard label="Open Incidents" value={stats?.openIncidents ?? 0} sub={`${stats?.flaggedSubmissions ?? 0} flagged`} icon={Siren} tone="rose" />
            <StatCard label="Scheduled Today" value={stats?.scheduledToday ?? 0} sub="upcoming" icon={CalendarClock} tone="violet" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live map preview */}
        <SectionCard
          className="lg:col-span-2"
          title="Live Guard Map"
          description="Real-time positions of all active guards"
          action={<button onClick={() => onNavigate('live')} className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">View full map →</button>}
        >
          <LiveMap
            checkpoints={[]}
            liveGuards={liveGuards}
            selectedGuardId={null}
            onSelectGuard={onSelectGuard}
            showGeofences={false}
            showRoutePath={false}
            className="h-[340px]"
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title="Recent Notifications"
          description="Latest alerts and events"
          action={<button onClick={() => onNavigate('incidents')} className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">View all →</button>}
        >
          <ScrollArea className="h-[340px] pr-3">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No notifications</p>
              ) : (
                notifications.map((n) => <NotificationRow key={n.id} n={n} />)
              )}
            </div>
          </ScrollArea>
        </SectionCard>
      </div>

      {/* Active patrols + Verification accuracy */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Active Patrols"
          description="Patrols currently in progress"
          action={<button onClick={() => onNavigate('patrols')} className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">Manage →</button>}
        >
          {activePatrols.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No active patrols right now.</p>
          ) : (
            <div className="space-y-3">
              {activePatrols.map((p) => <ActivePatrolRow key={p.id} patrol={p} />)}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Verification Accuracy"
          description="Checkpoint verification outcomes"
          action={<button onClick={() => onNavigate('analytics')} className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">Analytics →</button>}
        >
          {statsLoading ? <LoadingState rows={4} /> : <VerificationAccuracy stats={stats!} />}
        </SectionCard>
      </div>
    </div>
  )
}

function NotificationRow({ n }: { n: AppNotification }) {
  const tone = n.priority === 'CRITICAL' || n.priority === 'HIGH' ? 'rose' : n.priority === 'NORMAL' ? 'amber' : 'slate'
  const iconMap: Record<string, string> = { SOS: 'SOS', INCIDENT: 'INC', MISSED_CHECKPOINT: 'MIS', LATE_CHECKPOINT: 'LAT', SUSPICIOUS: 'SUS', PATROL_COMPLETE: '✓', PATROL_STARTING: '▸' }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
        tone === 'rose' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
        tone === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
        'bg-slate-500/15 text-slate-600 dark:text-slate-300'
      }`}>{iconMap[n.type] ?? '•'}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
        <p className="mt-1 text-[10px] text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
      </div>
    </div>
  )
}

function ActivePatrolRow({ patrol }: { patrol: PatrolSession }) {
  const progress = patrol.totalCheckpoints ? Math.round((patrol.completedCount / patrol.totalCheckpoints) * 100) : 0
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <GuardAvatar name={patrol.guardName} color={patrol.guardColor} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{patrol.routeName}</p>
            <StatusBadge status="ON_PATROL" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{patrol.guardName} · started {formatDistanceToNow(new Date(patrol.startedAt), { addSuffix: true })}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Progress</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{patrol.completedCount}/{patrol.totalCheckpoints} · {progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {patrol.completedCount} verified</span>
        {patrol.lateCount > 0 && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> {patrol.lateCount} late</span>}
        {patrol.suspiciousFlags > 0 && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-rose-500" /> {patrol.suspiciousFlags} flagged</span>}
      </div>
    </div>
  )
}

function VerificationAccuracy({ stats }: { stats: DashboardStats }) {
  const v = stats.verification
  const rows = [
    { label: 'True Acceptance', value: v.trueAcceptance, tone: 'bg-emerald-500', desc: 'Legitimate verifications accepted' },
    { label: 'True Rejection', value: v.trueRejection, tone: 'bg-slate-500', desc: 'Invalid submissions rejected' },
    { label: 'False Acceptance', value: v.falseAcceptance, tone: 'bg-rose-500', desc: 'Invalid submissions wrongly accepted' },
    { label: 'False Rejection', value: v.falseRejection, tone: 'bg-amber-500', desc: 'Legitimate submissions wrongly rejected' },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Success Rate</span>
        </div>
        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{v.successRate}%</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${r.tone}`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.label}</span>
            </div>
            <p className="ml-[18px] text-[10px] text-slate-400">{r.desc}</p>
          </div>
          <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
