'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { GuardAvatar } from '../guard-avatar'
import { StatusBadge, TimingBadge, VerificationBadge } from '../status-badges'
import { LiveMap } from '../live-map'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, AlertTriangle, Clock, Camera, MapPin, ClipboardList } from 'lucide-react'
import { safeFormat as format } from '@/lib/dates'
import type { PatrolSession, Checkpoint, Verification } from '@/lib/types'

const STATUS_TABS = ['ALL', 'ACTIVE', 'COMPLETED', 'COMPLETED_WITH_ISSUES', 'INCOMPLETE'] as const

export function PatrolsView() {
  const [tab, setTab] = React.useState<typeof STATUS_TABS[number]>('ALL')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['patrols', tab],
    queryFn: () => api.patrols(undefined, tab === 'ALL' ? undefined : tab),
  })
  const sessions = data?.sessions ?? []

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Patrol Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">View, monitor and review all patrol sessions.</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof STATUS_TABS[number])}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {t === 'ALL' ? 'All' : t === 'COMPLETED_WITH_ISSUES' ? 'With Issues' : t === 'COMPLETED' ? 'Completed' : t.charAt(0) + t.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : sessions.length === 0 ? (
        <SectionCard>
          <EmptyState icon={ClipboardList} title="No patrol sessions" description="Sessions will appear here once guards start patrols." />
        </SectionCard>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className="group flex items-center gap-4 rounded-xl border border-slate-200/70 bg-white p-4 text-left transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50"
            >
              <GuardAvatar name={s.guardName} color={s.guardColor} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{s.routeName}</p>
                  <StatusBadgeMini status={s.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.guardName} · {format(s.startedAt, 'dd MMM, HH:mm')}
                  {s.endedAt && ` → ${format(s.endedAt, 'HH:mm')}`}
                  {s.durationMin && ` · ${s.durationMin} min`}
                </p>
              </div>
              <div className="hidden items-center gap-3 text-xs sm:flex">
                <Metric label="Verified" value={s.completedCount} tone="emerald" icon={CheckCircle2} />
                {s.lateCount > 0 && <Metric label="Late" value={s.lateCount} tone="amber" icon={Clock} />}
                {s.missedCount > 0 && <Metric label="Missed" value={s.missedCount} tone="rose" icon={XCircle} />}
                {s.suspiciousFlags > 0 && <Metric label="Flagged" value={s.suspiciousFlags} tone="rose" icon={AlertTriangle} />}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && <PatrolDetailDialog sessionId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function Metric({ label, value, tone, icon: Icon }: { label: string; value: number; tone: string; icon: React.ComponentType<{ className?: string }> }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
      <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  )
}

function StatusBadgeMini({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    COMPLETED: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    COMPLETED_WITH_ISSUES: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    INCOMPLETE: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    ABORTED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? map.ACTIVE}`}>{status.replace(/_/g, ' ')}</span>
}

function PatrolDetailDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['patrol', sessionId], queryFn: () => api.patrol(sessionId) })
  const session = data?.session

  const checkpoints = (session?.checkpoints ?? []) as (Checkpoint & { verification: Verification | null })[]
  const verifiedIds = new Set(checkpoints.filter((c) => c.verification && (c.verification.status === 'VERIFIED' || c.verification.status === 'FLAGGED')).map((c) => c.id))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {session?.routeName ?? 'Patrol'}
            {session && <StatusBadgeMini status={session.status} />}
          </DialogTitle>
          <DialogDescription>
            {session ? `${session.guardName} · ${format(session.startedAt, 'dd MMM yyyy, HH:mm')}${session.endedAt ? ` → ${format(session.endedAt, 'HH:mm')}` : ''}` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !session ? (
          <LoadingState rows={4} />
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Progress" value={`${session.completedCount}/${session.totalCheckpoints}`} />
              <SummaryStat label="Late" value={String(session.lateCount)} tone={session.lateCount ? 'amber' : undefined} />
              <SummaryStat label="Missed" value={String(session.missedCount)} tone={session.missedCount ? 'rose' : undefined} />
              <SummaryStat label="Flagged" value={String(session.suspiciousFlags)} tone={session.suspiciousFlags ? 'rose' : undefined} />
            </div>

            {/* Map */}
            <div className="overflow-hidden rounded-xl border">
              <LiveMap
                checkpoints={checkpoints}
                liveGuards={[]}
                verifiedCheckpointIds={verifiedIds}
                showGeofences
                showRoutePath
                interactive={false}
                className="h-[280px]"
              />
            </div>

            {/* Report */}
            {session.report && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Digital Patrol Report</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{session.report}</p>
              </div>
            )}

            {/* Checkpoint timeline */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Checkpoint Verification Timeline</h4>
              <div className="space-y-2">
                {checkpoints.map((c) => {
                  const v = c.verification
                  return (
                    <div key={c.id} className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.sequence}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.code} · {c.name}</p>
                            <p className="text-[11px] text-slate-400">Expected window: +{c.expectedWindowMin} min from patrol start</p>
                          </div>
                        </div>
                        {v ? (
                          <div className="flex items-center gap-2">
                            <TimingBadge status={v.timingStatus} />
                            <VerificationBadge status={v.status} />
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 text-slate-400">Pending</Badge>
                        )}
                      </div>
                      {v && v.status !== 'MISSED' && (
                        <div className="mt-2 grid gap-3 border-t border-slate-100 pt-2 dark:border-slate-800 sm:grid-cols-2">
                          <div className="space-y-1 text-xs">
                            <p className="flex items-center gap-1.5 text-slate-500"><Camera className="h-3 w-3" /> {format(v.capturedAt, 'dd MMM, HH:mm:ss')}</p>
                            <p className="flex items-center gap-1.5 text-slate-500"><MapPin className="h-3 w-3" /> {v.distanceToCheckpoint >= 0 ? `${Math.round(v.distanceToCheckpoint)}m from CP · GPS ±${v.gpsAccuracy.toFixed(1)}m` : 'no GPS'}</p>
                            {v.notes && <p className="text-slate-600 dark:text-slate-300">📝 {v.notes}</p>}
                            {v.suspiciousFlags && (
                              <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><AlertTriangle className="h-3 w-3" /> Flags: {JSON.parse(v.suspiciousFlags).join(', ')}</p>
                            )}
                          </div>
                          {v.photoUrl && (
                            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                              <img src={v.photoUrl} alt={`Checkpoint ${c.code}`} className="h-24 w-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                      {v?.status === 'MISSED' && v.rejectionReason && (
                        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{v.rejectionReason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Incidents */}
            {session.incidents && session.incidents.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Incidents During Patrol</h4>
                <div className="space-y-2">
                  {session.incidents.map((i) => (
                    <div key={i.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{i.type} · {i.severity}</span>
                        <Badge variant="outline">{i.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{i.description}</p>
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

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'rose' }) {
  const toneClass = tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
