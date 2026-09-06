'use client'
import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AppShell, type ViewId } from '@/components/patroltrack/app-shell'
import { useRealtime } from '@/components/patroltrack/use-realtime'
import { GuardMode } from '@/components/patroltrack/guard-mode'
import { DashboardView } from '@/components/patroltrack/views/dashboard'
import { LiveTrackingView } from '@/components/patroltrack/views/live-tracking'
import { PatrolsView } from '@/components/patroltrack/views/patrols'
import { SchedulesView } from '@/components/patroltrack/views/schedules'
import { CheckpointsView } from '@/components/patroltrack/views/checkpoints'
import { GuardsView } from '@/components/patroltrack/views/guards'
import { IncidentsView } from '@/components/patroltrack/views/incidents'
import { ReportsView } from '@/components/patroltrack/views/reports'
import { AnalyticsView } from '@/components/patroltrack/views/analytics'
import { NotificationsView } from '@/components/patroltrack/views/notifications'
import { AuditView } from '@/components/patroltrack/views/audit'
import { SettingsView } from '@/components/patroltrack/views/settings'
import { toast } from 'sonner'

export default function Home() {
  const [view, setView] = React.useState<ViewId>('dashboard')
  const [guardModeOpen, setGuardModeOpen] = React.useState(false)
  const qc = useQueryClient()

  const { data: meData, isLoading: meLoading } = useQuery({ queryKey: ['me'], queryFn: api.me })
  const user = meData?.user

  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications })
  const unreadCount = notifData?.notifications.filter((n) => !n.read).length ?? 0

  const realtime = useRealtime()

  // Toast on incoming SOS
  React.useEffect(() => {
    if (realtime.sosAlert) {
      toast.error(`🚨 EMERGENCY SOS — ${realtime.sosAlert.guardName}`, { description: realtime.sosAlert.locationLabel ?? 'Unknown location' })
      realtime.clearSos()
    }
  }, [realtime.sosAlert, realtime.clearSos])

  // Toast on incoming notification
  React.useEffect(() => {
    if (realtime.notification) {
      toast(realtime.notification.title, { description: realtime.notification.message })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      realtime.clearCheckpointUpdate()
    }
  }, [realtime.notification, qc, realtime.clearCheckpointUpdate])

  const handleLogout = async () => {
    await api.logout()
    qc.invalidateQueries({ queryKey: ['me'] })
    window.location.reload()
  }

  if (meLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
          <p className="text-sm text-slate-500">Loading PatrolTrack…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppShell
        user={user}
        view={view}
        setView={setView}
        unreadCount={unreadCount}
        onLogout={handleLogout}
        onOpenGuardApp={() => setGuardModeOpen(true)}
      >
        {view === 'dashboard' && <DashboardView liveGuards={realtime.liveGuards} onSelectGuard={() => setView('live')} onNavigate={(v) => setView(v)} />}
        {view === 'live' && <LiveTrackingView liveGuards={realtime.liveGuards} sosAlert={realtime.sosAlert} />}
        {view === 'patrols' && <PatrolsView />}
        {view === 'schedules' && <SchedulesView />}
        {view === 'checkpoints' && <CheckpointsView />}
        {view === 'guards' && <GuardsView />}
        {view === 'incidents' && <IncidentsView />}
        {view === 'reports' && <ReportsView />}
        {view === 'analytics' && <AnalyticsView />}
        {view === 'notifications' && <NotificationsView />}
        {view === 'audit' && <AuditView />}
        {view === 'settings' && user.role === 'ADMIN' && <SettingsView user={user} />}
        {view === 'settings' && user.role !== 'ADMIN' && (
          <div className="p-6 text-center text-sm text-slate-500">Settings are only available to administrators.</div>
        )}
      </AppShell>

      {guardModeOpen && <GuardMode onClose={() => setGuardModeOpen(false)} />}
    </>
  )
}
