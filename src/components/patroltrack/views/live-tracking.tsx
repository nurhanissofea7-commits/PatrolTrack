'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard } from '../shared'
import { LiveMap } from '../live-map'
import { GuardAvatar } from '../guard-avatar'
import { StatusBadge } from '../status-badges'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BatteryMedium, Wifi, MapPin, Clock, Radio, ShieldAlert } from 'lucide-react'
import { safeDistanceToNow } from '@/lib/dates'
import type { LiveGuard } from '@/lib/types'

export function LiveTrackingView({ liveGuards, sosAlert }: { liveGuards: LiveGuard[]; sosAlert: any | null }) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const { data: routesData } = useQuery({ queryKey: ['routes'], queryFn: api.routes })

  // Gather checkpoints from all routes for the map
  const allCheckpoints = React.useMemo(() => {
    const routes = routesData?.routes ?? []
    return routes.flatMap((r) => r.checkpoints.map((c) => ({ ...c, routeName: r.name })))
  }, [routesData])

  const activeGuards = liveGuards.filter((g) => g.status !== 'OFF_DUTY' || true) // show all
  const selectedGuard = liveGuards.find((g) => g.guardId === selected) ?? null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {sosAlert && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 ring-1 ring-rose-500/30">
          <ShieldAlert className="h-8 w-8 animate-pulse text-rose-600" />
          <div className="flex-1">
            <p className="font-bold text-rose-700 dark:text-rose-300">⚠ EMERGENCY SOS — {sosAlert.guardName}</p>
            <p className="text-sm text-rose-600 dark:text-rose-400/90">
              Activated at {sosAlert.locationLabel ?? `${sosAlert.lat.toFixed(5)}, ${sosAlert.lng.toFixed(5)}`} · GPS accuracy {sosAlert.accuracy?.toFixed(1)}m
            </p>
          </div>
          <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">ACTIVE</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Live Guard Tracking Map"
            description="Real-time GPS positions transmitted during active patrols"
          >
            <LiveMap
              checkpoints={allCheckpoints}
              liveGuards={liveGuards}
              selectedGuardId={selected}
              onSelectGuard={setSelected}
              showGeofences
              showRoutePath={false}
              className="h-[560px]"
            />
          </SectionCard>
        </div>

        {/* Guard list + detail */}
        <div className="space-y-4">
          <SectionCard title="Active Guards" description={`${liveGuards.length} guards transmitting`}>
            <ScrollArea className="h-[260px] pr-3">
              <div className="space-y-2">
                {liveGuards.map((g) => (
                  <button
                    key={g.guardId}
                    onClick={() => setSelected(g.guardId)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                      selected === g.guardId
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
                    }`}
                  >
                    <GuardAvatar name={g.guardName} color="emerald" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{g.guardName}</p>
                      <p className="truncate text-xs text-slate-500">{g.routeName ?? g.status.replace(/_/g, ' ').toLowerCase()}</p>
                    </div>
                    <StatusBadge status={g.status} />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </SectionCard>

          {selectedGuard ? (
            <SectionCard title="Guard Details" description="Live status & telemetry">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <GuardAvatar name={selectedGuard.guardName} color="emerald" size="lg" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedGuard.guardName}</p>
                    <StatusBadge status={selectedGuard.status} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Telemetry icon={Radio} label="GPS Accuracy" value={`${selectedGuard.accuracy?.toFixed(1)} m`} />
                  <Telemetry icon={BatteryMedium} label="Battery" value={`${selectedGuard.battery}%`} />
                  <Telemetry icon={MapPin} label="Latitude" value={selectedGuard.lat.toFixed(5)} />
                  <Telemetry icon={MapPin} label="Longitude" value={selectedGuard.lng.toFixed(5)} />
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    Last update: {safeDistanceToNow(selectedGuard.lastUpdate)}
                  </p>
                  {selectedGuard.routeName && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Radio className="h-3.5 w-3.5" />
                      Patrol: {selectedGuard.routeName}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Guard Details" description="Select a guard from the map or list">
              <p className="py-6 text-center text-sm text-slate-400">Click a guard on the map to view live telemetry.</p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

function Telemetry({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200/70 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  )
}
