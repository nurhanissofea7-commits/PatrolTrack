'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { SeverityBadge } from '../status-badges'
import { GuardAvatar } from '../guard-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Siren, Flame, UserX, Wrench, CarFront, PackageX, Eye, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Incident, IncidentType } from '@/lib/types'

const INCIDENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  THEFT: PackageX, SUSPICIOUS: Eye, DAMAGE: AlertTriangle, FIRE: Flame,
  ACCIDENT: CarFront, ACCESS: UserX, EQUIPMENT: Wrench, HAZARD: AlertTriangle, OTHER: AlertTriangle,
}

const STATUS_TABS = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const

export function IncidentsView() {
  const [tab, setTab] = React.useState<typeof STATUS_TABS[number]>('ALL')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['incidents', tab],
    queryFn: () => api.incidents(tab === 'ALL' ? undefined : tab),
  })
  const incidents = data?.incidents ?? []

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Incident Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Review and manage incident reports submitted by guards.</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof STATUS_TABS[number])}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">{t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : incidents.length === 0 ? (
        <SectionCard><EmptyState icon={AlertTriangle} title="No incidents" description="Incident reports will appear here." /></SectionCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {incidents.map((i) => <IncidentCard key={i.id} incident={i} onClick={() => setSelectedId(i.id)} />)}
        </div>
      )}

      {selectedId && <IncidentDetailDialog incidentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const Icon = INCIDENT_ICONS[incident.type] ?? AlertTriangle
  return (
    <button onClick={onClick} className="group flex gap-3 rounded-xl border border-slate-200/70 bg-white p-4 text-left transition-all hover:border-rose-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
        incident.severity === 'MEDIUM' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
        'bg-slate-500/15 text-slate-600 dark:text-slate-300'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{incident.type.replace(/_/g, ' ')}</p>
          <SeverityBadge severity={incident.severity} />
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{incident.description}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>{incident.guard ? `${incident.guard.name}` : 'Unknown'} · {format(new Date(incident.occurredAt), 'dd MMM, HH:mm')}</span>
          <Badge variant="outline" className="text-[10px]">{incident.status}</Badge>
        </div>
      </div>
    </button>
  )
}

function IncidentDetailDialog({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: all } = useQuery({ queryKey: ['incidents', 'ALL'], queryFn: () => api.incidents() })
  const incident = all?.incidents.find((i) => i.id === incidentId)
  const [status, setStatus] = React.useState('')

  React.useEffect(() => {
    if (incident) setStatus(incident.status)
  }, [incident])

  const updateMutation = useMutation({
    mutationFn: (newStatus: string) => api.updateIncident(incidentId, newStatus),
    onSuccess: () => {
      toast.success('Incident status updated')
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const Icon = incident ? (INCIDENT_ICONS[incident.type] ?? AlertTriangle) : AlertTriangle

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400"><Icon className="h-5 w-5" /></div>
            <span>{incident?.type.replace(/_/g, ' ') ?? 'Incident'}</span>
          </DialogTitle>
          <DialogDescription>
            {incident ? `Reported ${format(new Date(incident.occurredAt), 'dd MMM yyyy, HH:mm')} · ${incident.locationLabel ?? 'Unknown location'}` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {!incident ? (
          <LoadingState rows={3} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={incident.severity} />
              <Badge variant="outline">{incident.status}</Badge>
              {incident.guard && (
                <div className="flex items-center gap-1.5">
                  <GuardAvatar name={incident.guard.name} color={incident.guard.color} size="sm" />
                  <span className="text-sm">{incident.guard.name}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-sm text-slate-700 dark:text-slate-200">{incident.description}</p>
            </div>

            {incident.photoUrls.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><Camera className="h-3.5 w-3.5" /> Photographic Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  {incident.photoUrls.map((url, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                      <img src={url} alt={`Evidence ${i + 1}`} className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Update Status</p>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => updateMutation.mutate(status)} disabled={updateMutation.isPending || status === incident.status} className="bg-emerald-600 hover:bg-emerald-700">
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {incident.session && (
              <p className="text-xs text-slate-400">Reported during patrol: {incident.session.routeName}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
