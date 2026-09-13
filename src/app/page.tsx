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
import { UsersView } from '@/components/patroltrack/views/users'
import { SettingsView } from '@/components/patroltrack/views/settings'
import { toast } from 'sonner'

export default function Home() {
  const [view, setView] = React.useState<ViewId>('dashboard')
  const [guardModeOpen, setGuardModeOpen] = React.useState(false)
  const qc = useQueryClient()

  const { data: meData, isLoading: meLoading } = useQuery({ queryKey: ['me'], queryFn: api.me })
  const user = meData?.user

  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications, enabled: !!user })
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

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
          <p className="text-sm text-slate-500">Loading PatrolTrack…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onSuccess={() => qc.invalidateQueries({ queryKey: ['me'] })} />
  }

  // Security guards get the mobile app interface directly — no supervisor dashboard.
  if (user.role === 'GUARD') {
    return <GuardMode onSignOut={handleLogout} />
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
        {view === 'users' && user.role === 'ADMIN' && <UsersView currentUser={user} />}
        {view === 'settings' && user.role === 'ADMIN' && <SettingsView user={user} />}
        {view === 'settings' && user.role !== 'ADMIN' && (
          <div className="p-6 text-center text-sm text-slate-500">Settings are only available to administrators.</div>
        )}
      </AppShell>

      {guardModeOpen && <GuardMode onClose={() => setGuardModeOpen(false)} />}
    </>
  )
}

// ─── Login screen ───────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.login(email.trim().toLowerCase(), password)
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { role: 'Administrator', email: 'admin@patroltrack.io', password: 'admin123', color: 'violet' },
    { role: 'Supervisor', email: 'hafiz@patroltrack.io', password: 'super123', color: 'emerald' },
    { role: 'Security Guard', email: 'ahmad@patroltrack.io', password: 'guard123', color: 'sky' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <svg className="h-8 w-8 text-slate-950" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">PatrolTrack</h1>
            <p className="text-sm text-slate-400">Security Patrol Management System</p>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-white">Sign in to your account</h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@patroltrack.io"
                required
                autoFocus
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Demo accounts — click to autofill</p>
          <div className="space-y-1.5">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                onClick={() => { setEmail(a.email); setPassword(a.password); setError(null) }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2 text-left transition-colors hover:border-emerald-500/40 hover:bg-slate-800"
              >
                <div>
                  <p className="text-xs font-medium text-slate-200">{a.role}</p>
                  <p className="font-mono text-[10px] text-slate-400">{a.email}</p>
                </div>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{a.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
