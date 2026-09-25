'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState, StatCard } from '../shared'
import { GuardAvatar } from '../guard-avatar'
import { StatusBadge } from '../status-badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, Star, Phone, Mail, IdCard, Shield, Award, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import { safeFormat as format } from '@/lib/dates'
import type { Guard, PatrolSession, Incident } from '@/lib/types'

export function GuardsView() {
  const { data, isLoading } = useQuery({ queryKey: ['guards'], queryFn: api.guards })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const guards = data?.guards ?? []

  const onDuty = guards.filter((g) => g.isOnline && g.status !== 'OFF_DUTY').length
  const onPatrol = guards.filter((g) => g.status === 'ON_PATROL').length
  const offline = guards.filter((g) => !g.isOnline).length
  const avgRating = guards.length ? (guards.reduce((a, g) => a + g.rating, 0) / guards.length).toFixed(1) : '—'

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Security Guards</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage and monitor all security personnel.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Guards" value={guards.length} icon={Users} tone="slate" />
        <StatCard label="On Duty" value={onDuty} icon={Activity} tone="sky" />
        <StatCard label="On Patrol" value={onPatrol} icon={Shield} tone="emerald" />
        <StatCard label="Avg Rating" value={avgRating} icon={Star} tone="amber" />
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : guards.length === 0 ? (
        <SectionCard><EmptyState icon={Users} title="No guards" /></SectionCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guards.map((g) => <GuardCard key={g.id} guard={g} onClick={() => setSelectedId(g.id)} />)}
        </div>
      )}

      {selectedId && <GuardDetailDialog guardId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function GuardCard({ guard, onClick }: { guard: Guard; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex flex-col rounded-xl border border-slate-200/70 bg-white p-4 text-left transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div className="relative">
          <GuardAvatar name={guard.name} color={guard.avatarColor} size="lg" />
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
            guard.status === 'ON_PATROL' ? 'bg-emerald-500' :
            guard.status === 'ON_DUTY' ? 'bg-sky-500' :
            guard.status === 'EMERGENCY' ? 'bg-rose-500' : 'bg-slate-300'
          } dark:border-slate-900`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{guard.name}</p>
          <p className="text-xs text-slate-500">{guard.rank} · {guard.employeeId}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusBadge status={guard.status} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{guard.rating.toFixed(1)}</span>
        </div>
        <div className="text-xs text-slate-500">
          {guard.shift} shift · {guard.supervisor?.name ?? 'Unassigned'}
        </div>
      </div>
    </button>
  )
}

function GuardDetailDialog({ guardId, onClose }: { guardId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['guard', guardId], queryFn: () => api.guard(guardId) })
  const guard = data?.guard
  const sessions = data?.sessions ?? []
  const incidents = data?.incidents ?? []
  const stats = data?.patrolStats

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {guard && <GuardAvatar name={guard.name} color={guard.avatarColor} size="md" />}
            <span>{guard?.name ?? 'Loading...'}</span>
          </DialogTitle>
          <DialogDescription>{guard ? `${guard.rank} · ${guard.employeeId} · ${guard.shift} shift` : 'Loading guard details...'}</DialogDescription>
        </DialogHeader>

        {isLoading || !guard ? (
          <LoadingState rows={4} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={guard.status} />
              <Badge variant="outline"><Star className="mr-1 h-3 w-3 text-amber-500" />{guard.rating.toFixed(1)} rating</Badge>
              {guard.licenseNumber && <Badge variant="outline"><IdCard className="mr-1 h-3 w-3" />{guard.licenseNumber}</Badge>}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ContactRow icon={Mail} label="Email" value={guard.email} />
              <ContactRow icon={Phone} label="Phone" value={guard.phone ?? '—'} />
              <ContactRow icon={Users} label="Supervisor" value={guard.supervisor?.name ?? 'Unassigned'} />
              <ContactRow icon={Shield} label="Hired" value={format(guard.hireDate, 'dd MMM yyyy')} />
            </div>

            {guard.deviceInfo && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="font-medium text-slate-500">Device: {guard.deviceInfo}</p>
                {guard.batteryLevel != null && <p className="mt-0.5">Battery: {guard.batteryLevel}%</p>}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <StatTile label="Total Patrols" value={stats.total} />
                <StatTile label="Completed" value={stats.completed} tone="emerald" />
                <StatTile label="With Issues" value={stats.withIssues} tone="amber" />
                <StatTile label="Active" value={stats.active} tone="sky" />
              </div>
            )}

            {/* Patrol history */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Patrol History</h4>
              <ScrollArea className="max-h-[220px] pr-3">
                <div className="space-y-2">
                  {sessions.length === 0 ? <p className="text-sm text-slate-400">No patrols yet.</p> : sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white p-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{s.routeName}</p>
                        <p className="text-[11px] text-slate-400">{format(s.startedAt, 'dd MMM, HH:mm')}{s.endedAt && ` → ${format(s.endedAt, 'HH:mm')}`}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600">{s.completedCount}/{s.totalCheckpoints}</span>
                        <Badge variant="outline" className="text-[10px]">{s.status.replace(/_/g, ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Incidents */}
            {incidents.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Incidents</h4>
                <div className="space-y-2">
                  {incidents.map((i) => (
                    <div key={i.id} className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-500" />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{i.type} · {i.severity}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{i.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ContactRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-sm text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'sky' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : tone === 'sky' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-2.5 text-center dark:border-slate-800 dark:bg-slate-900/50">
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}
