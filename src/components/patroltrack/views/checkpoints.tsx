'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { LiveMap } from '../live-map'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPinned, Clock, Ruler, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PatrolRoute, Checkpoint } from '@/lib/types'

export function CheckpointsView() {
  const { data, isLoading } = useQuery({ queryKey: ['routes'], queryFn: api.routes })
  const routes = data?.routes ?? []
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null)
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Checkpoints & Routes</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage patrol routes and their checkpoint sequences.</p>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : routes.length === 0 ? (
        <SectionCard><EmptyState icon={MapPinned} title="No routes" /></SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Route list */}
          <SectionCard title="Patrol Routes" description={`${routes.length} routes`} bodyClassName="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1.5 p-3">
                {routes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      (selectedRoute?.id === r.id)
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50'
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <MapPinned className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.checkpointCount} checkpoints · {r.estimatedDurationMin} min</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </SectionCard>

          {/* Selected route detail with map */}
          {selectedRoute && (
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title={selectedRoute.name} description={selectedRoute.description ?? selectedRoute.location}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile icon={Clock} label="Est. Duration" value={`${selectedRoute.estimatedDurationMin} min`} />
                  <InfoTile icon={Ruler} label="Est. Distance" value={`${selectedRoute.estimatedDistanceM} m`} />
                  <InfoTile icon={MapPinned} label="Checkpoints" value={String(selectedRoute.checkpointCount)} />
                </div>
              </SectionCard>

              <SectionCard title="Route Map" description="Checkpoints shown in sequence with geofence radius">
                <LiveMap
                  checkpoints={selectedRoute.checkpoints}
                  liveGuards={[]}
                  showGeofences
                  showRoutePath
                  interactive={false}
                  className="h-[360px]"
                />
              </SectionCard>

              <SectionCard title="Checkpoint Sequence" description="Ordered list of checkpoints on this route">
                <div className="space-y-2">
                  {selectedRoute.checkpoints.map((c, i) => (
                    <CheckpointRow key={c.id} cp={c} index={i} isLast={i === selectedRoute.checkpoints.length - 1} />
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  )
}

function CheckpointRow({ cp, index, isLast }: { cp: Checkpoint; index: number; isLast: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{cp.sequence}</div>
        {!isLast && <div className="my-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{cp.code}</Badge>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{cp.name}</p>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Lat {cp.lat.toFixed(5)}, Lng {cp.lng.toFixed(5)}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">±{cp.radiusM}m</span>
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-700 dark:text-sky-300">+{cp.expectedWindowMin}min</span>
        </div>
      </div>
    </div>
  )
}
