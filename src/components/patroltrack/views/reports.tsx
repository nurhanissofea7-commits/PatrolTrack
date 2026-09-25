'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { GuardAvatar } from '../guard-avatar'
import { StatusBadge } from '../status-badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, Printer } from 'lucide-react'
import { safeFormat as format } from '@/lib/dates'
import type { PatrolSession } from '@/lib/types'

const STATUS_TABS = ['ALL', 'COMPLETED', 'COMPLETED_WITH_ISSUES', 'INCOMPLETE'] as const

export function ReportsView() {
  const [tab, setTab] = React.useState<typeof STATUS_TABS[number]>('ALL')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['reports', tab],
    queryFn: () => api.patrols(undefined, tab === 'ALL' ? 'COMPLETED' : tab),
  })
  // Also fetch incomplete sessions separately when ALL
  const sessions = data?.sessions ?? []

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Digital Patrol Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Auto-generated reports for completed patrols.</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof STATUS_TABS[number])}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">{t === 'ALL' ? 'All' : t === 'COMPLETED_WITH_ISSUES' ? 'With Issues' : t.charAt(0) + t.slice(1).toLowerCase()}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : sessions.length === 0 ? (
        <SectionCard><EmptyState icon={FileText} title="No reports" description="Completed patrol reports will appear here." /></SectionCard>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => <ReportCard key={s.id} session={s} onClick={() => setSelectedId(s.id)} />)}
        </div>
      )}

      {selectedId && <ReportDialog sessionId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function ReportCard({ session, onClick }: { session: PatrolSession; onClick: () => void }) {
  const statusColor = session.status === 'COMPLETED' ? 'emerald' : session.status === 'COMPLETED_WITH_ISSUES' ? 'amber' : 'rose'
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-xl border border-slate-200/70 bg-white p-4 text-left transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <GuardAvatar name={session.guardName} color={session.guardColor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{session.routeName}</p>
          <Badge variant="outline" className={`text-[10px] border-${statusColor}-500/30 bg-${statusColor}-500/10 text-${statusColor}-700 dark:text-${statusColor}-300`}>
            {session.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{session.guardName} · {format(session.startedAt, 'dd MMM yyyy, HH:mm')}{session.durationMin && ` · ${session.durationMin} min`}</p>
        {session.report && <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{session.report}</p>}
      </div>
      <div className="hidden items-center gap-3 text-xs sm:flex">
        <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{session.completedCount}</span>
        {session.missedCount > 0 && <span className="flex items-center gap-1 text-rose-600"><XCircle className="h-3.5 w-3.5" />{session.missedCount}</span>}
        {session.suspiciousFlags > 0 && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{session.suspiciousFlags}</span>}
      </div>
    </button>
  )
}

function ReportDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['patrol', sessionId], queryFn: () => api.patrol(sessionId) })
  const session = data?.session

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span>Digital Patrol Report</span>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
          </DialogTitle>
          <DialogDescription>{session ? `${session.routeName} · ${session.guardName}` : 'Loading...'}</DialogDescription>
        </DialogHeader>

        {isLoading || !session ? (
          <LoadingState rows={4} />
        ) : (
          <div className="space-y-4">
            {/* Report header */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Guard" value={session.guardName} />
                <Field label="Route" value={session.routeName} />
                <Field label="Date" value={format(session.startedAt, 'dd MMM yyyy')} />
                <Field label="Duration" value={session.durationMin ? `${session.durationMin} min` : '—'} />
                <Field label="Started" value={format(session.startedAt, 'HH:mm:ss')} />
                <Field label="Ended" value={session.endedAt ? format(session.endedAt, 'HH:mm:ss') : '—'} />
                <Field label="Checkpoints" value={`${session.completedCount}/${session.totalCheckpoints}`} />
                <Field label="Status" value={session.status.replace(/_/g, ' ')} />
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryBox label="Completed" value={session.completedCount} tone="emerald" icon={CheckCircle2} />
              <SummaryBox label="Missed" value={session.missedCount} tone="rose" icon={XCircle} />
              <SummaryBox label="Late" value={session.lateCount} tone="amber" icon={Clock} />
              <SummaryBox label="Flagged" value={session.suspiciousFlags} tone="rose" icon={AlertTriangle} />
            </div>

            {/* Report body */}
            {session.report && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Report Summary</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{session.report}</p>
              </div>
            )}

            {session.notes && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Guard Notes</p>
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">{session.notes}</p>
              </div>
            )}

            {/* Checkpoint verifications */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Checkpoint Verifications</h4>
              <ScrollArea className="max-h-[300px] pr-3">
                <div className="space-y-2">
                  {session.checkpoints?.map((c: any) => {
                    const v = c.verification
                    return (
                      <div key={c.id} className="flex items-start gap-3 rounded-lg border border-slate-200/70 bg-white p-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.sequence}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{c.code} · {c.name}</p>
                          {v ? (
                            <p className="text-[11px] text-slate-400">
                              {format(v.capturedAt, 'dd MMM, HH:mm:ss')} ·
                              {' '}{v.distanceToCheckpoint >= 0 ? `${Math.round(v.distanceToCheckpoint)}m` : 'no GPS'} ·
                              {' '}{v.timingStatus.replace(/_/g, ' ')} ·
                              {' '}<span className={v.status === 'VERIFIED' ? 'text-emerald-600' : v.status === 'FLAGGED' ? 'text-amber-600' : 'text-rose-600'}>{v.status}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400">Not verified</p>
                          )}
                        </div>
                        {v?.photoUrl && <img src={v.photoUrl} alt={c.code} className="h-12 w-16 rounded object-cover" />}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Incidents */}
            {session.incidents && session.incidents.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Incidents Reported</h4>
                <div className="space-y-2">
                  {session.incidents.map((i) => (
                    <div key={i.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{i.type.replace(/_/g, ' ')} · {i.severity}</p>
                        <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  )
}

function SummaryBox({ label, value, tone, icon: Icon }: { label: string; value: number; tone: string; icon: React.ComponentType<{ className?: string }> }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className={`mt-0.5 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
