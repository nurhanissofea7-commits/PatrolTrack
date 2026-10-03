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
        {view === 'audit' && user.role === 'ADMIN' && <AuditView />}
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
  const [showPassword, setShowPassword] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)

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
    { role: 'Administrator', email: 'admin@patroltrack.io', password: 'admin123', color: 'violet', icon: 'shield', desc: 'Full system access' },
    { role: 'Supervisor', email: 'hafiz@patroltrack.io', password: 'super123', color: 'emerald', icon: 'eye', desc: 'Monitor & manage patrols' },
    { role: 'Security Guard', email: 'ahmad@patroltrack.io', password: 'guard123', color: 'sky', icon: 'user', desc: 'Patrol & checkpoint app' },
  ]

  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/40', glow: 'shadow-violet-500/20' },
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20' },
    sky: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/40', glow: 'shadow-sky-500/20' },
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
      {/* Floating orbs */}
      <div className="absolute left-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-sky-500/10 blur-3xl" style={{ animationDelay: '1s' }} />
      <div className="absolute left-1/3 bottom-1/3 h-64 w-64 animate-pulse rounded-full bg-violet-500/10 blur-3xl" style={{ animationDelay: '2s' }} />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-emerald-500/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40">
              <svg className="h-9 w-9 text-slate-950" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>
            </div>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">PatrolTrack</h1>
            <p className="mt-1 text-sm font-medium text-slate-400">Security Guard Patrol System with Real-Time Monitoring</p>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-1 text-lg font-semibold text-white">Welcome back</h2>
          <p className="mb-5 text-xs text-slate-500">Sign in to access your dashboard</p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Email</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@patroltrack.io"
                  required
                  autoFocus
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0.55 0 1-0.45 1-1V7c0-0.55-0.45-1-1-1s-1 0.45-1 1v3c0 0.55 0.45 1 1 1zm6-4h-2V5c0-2.21-1.79-4-4-4S8 2.79 8 5v2H6c-1.1 0-2 0.9-2 2v10c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V9c0-1.1-0.9-2-2-2z" /></svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="group mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </>
            )}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            Demo accounts — click to autofill
            <span className="h-px flex-1 bg-slate-800" />
          </p>
          <div className="space-y-2">
            {demoAccounts.map((a) => {
              const c = colorMap[a.color]
              const isSelected = selectedRole === a.role
              return (
                <button
                  key={a.email}
                  onClick={() => { setEmail(a.email); setPassword(a.password); setError(null); setSelectedRole(a.role) }}
                  className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:scale-[1.02] ${
                    isSelected ? `${c.border} ${c.bg}` : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
                    {a.icon === 'shield' && <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                    {a.icon === 'eye' && <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    {a.icon === 'user' && <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200">{a.role}</p>
                    <p className="text-[10px] text-slate-500">{a.desc}</p>
                  </div>
                  <span className="rounded bg-slate-950/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{a.password}</span>
                </button>
              )
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-600">
          © 2025 PatrolTrack · All rights reserved
        </p>
      </div>
    </div>
  )
}
