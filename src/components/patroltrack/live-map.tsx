'use client'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { projectToMap } from '@/lib/patrol'
import type { Checkpoint, LiveGuard } from '@/lib/types'

interface MapProps {
  checkpoints: Checkpoint[]
  liveGuards: LiveGuard[]
  verifiedCheckpointIds?: Set<string>
  currentCheckpointId?: string | null
  selectedGuardId?: string | null
  onSelectGuard?: (id: string) => void
  showGeofences?: boolean
  showRoutePath?: boolean
  className?: string
  interactive?: boolean
}

// Buildings drawn on the stylized campus map (in 0-100 SVG space)
const BUILDINGS = [
  { id: 'A', name: 'Building A', x: 45, y: 22, w: 32, h: 22, color: '#1e293b' },
  { id: 'B', name: 'Building B', x: 62, y: 70, w: 28, h: 18, color: '#1e293b' },
  { id: 'P1', name: 'Visitor Parking', x: 14, y: 60, w: 20, h: 14, color: '#0f172a' },
  { id: 'P2', name: 'Staff Parking', x: 78, y: 38, w: 16, h: 14, color: '#0f172a' },
  { id: 'Gate', name: 'Main Gate', x: 8, y: 40, w: 6, h: 12, color: '#334155' },
]

export function LiveMap({
  checkpoints,
  liveGuards,
  verifiedCheckpointIds,
  currentCheckpointId,
  selectedGuardId,
  onSelectGuard,
  showGeofences = true,
  showRoutePath = true,
  className,
  interactive = true,
}: MapProps) {
  const [hover, setHover] = useState<string | null>(null)

  const safe = (n: number, fallback = 50) => (typeof n === 'number' && isFinite(n) ? n : fallback)

  const projectedCheckpoints = useMemo(
    () => checkpoints.map((c) => ({ ...c, p: projectToMap(c.lat, c.lng) })),
    [checkpoints]
  )
  const projectedGuards = useMemo(
    () => liveGuards.filter((g) => typeof g.lat === 'number' && typeof g.lng === 'number' && isFinite(g.lat) && isFinite(g.lng)).map((g) => ({ ...g, p: projectToMap(g.lat, g.lng) })),
    [liveGuards]
  )

  // Route path through checkpoints in sequence
  const routePath = useMemo(() => {
    if (!showRoutePath || projectedCheckpoints.length < 2) return null
    const sorted = [...projectedCheckpoints].sort((a, b) => a.sequence - b.sequence)
    return sorted.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.p.x.toFixed(2)} ${c.p.y.toFixed(2)}`).join(' ')
  }, [projectedCheckpoints, showRoutePath])

  const statusColor = (status: string) => {
    switch (status) {
      case 'ON_PATROL': return '#10b981'
      case 'ON_DUTY': return '#0ea5e9'
      case 'EMERGENCY': return '#ef4444'
      case 'DELAYED': return '#f59e0b'
      case 'OFFLINE': return '#a1a1aa'
      default: return '#64748b'
    }
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl border bg-slate-950', className)}>
      {/* Map SVG */}
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="grass" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0b3a2f" />
            <stop offset="100%" stopColor="#06140f" />
          </radialGradient>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#ffffff" strokeWidth="0.15" opacity="0.06" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground */}
        <rect width="100" height="100" fill="url(#grass)" />
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Roads */}
        <g stroke="#1f2937" strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="40" y1="0" x2="40" y2="100" />
          <line x1="0" y1="44" x2="100" y2="44" strokeDasharray="2 1.5" stroke="#fbbf24" strokeWidth="0.4" />
          <line x1="34" y1="0" x2="34" y2="100" strokeDasharray="2 1.5" stroke="#fbbf24" strokeWidth="0.4" />
        </g>

        {/* Buildings */}
        {BUILDINGS.map((b) => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="1.2" fill={b.color} stroke="#475569" strokeWidth="0.3" />
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 0.6} textAnchor="middle" fontSize="2.4" fill="#94a3b8" fontWeight="600" fontFamily="ui-monospace, monospace">
              {b.name}
            </text>
          </g>
        ))}

        {/* Route path */}
        {routePath && (
          <path d={routePath} fill="none" stroke="#34d399" strokeWidth="0.8" strokeDasharray="2 1.2" strokeLinecap="round" opacity="0.55" />
        )}

        {/* Geofences */}
        {showGeofences && projectedCheckpoints.map((c) => {
          const radius = (c.radiusM / 40) // approx visual radius
          const isCurrent = currentCheckpointId === c.id
          return (
            <circle
              key={`gf-${c.id}`}
              cx={c.p.x}
              cy={c.p.y}
              r={radius}
              fill={isCurrent ? '#f59e0b' : '#10b981'}
              fillOpacity={isCurrent ? 0.12 : 0.06}
              stroke={isCurrent ? '#f59e0b' : '#10b981'}
              strokeWidth="0.25"
              strokeOpacity={0.6}
            />
          )
        })}

        {/* Checkpoints */}
        {projectedCheckpoints.map((c) => {
          const verified = verifiedCheckpointIds?.has(c.id)
          const isCurrent = currentCheckpointId === c.id
          const fill = verified ? '#10b981' : isCurrent ? '#f59e0b' : '#475569'
          const label = c.code.split('-')[1] // e.g. "CP01"
          return (
            <g key={c.id} className={interactive ? 'cursor-pointer' : ''}>
              {isCurrent && (
                <circle cx={c.p.x} cy={c.p.y} r="2.4" fill="#f59e0b" opacity="0.3">
                  <animate attributeName="r" values="2;3.4;2" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={c.p.x} cy={c.p.y} r="1.6" fill={fill} stroke="#0f172a" strokeWidth="0.3" />
              <text x={c.p.x} y={c.p.y + 0.5} textAnchor="middle" fontSize="1.3" fill="#0f172a" fontWeight="700" fontFamily="ui-monospace, monospace">
                {label.slice(-2)}
              </text>
            </g>
          )
        })}

        {/* Guards (drawn on top) */}
        {projectedGuards.map((g) => {
          const color = statusColor(g.status)
          const selected = selectedGuardId === g.guardId
          const isHover = hover === g.guardId
          const r = selected || isHover ? 3.4 : 2.6
          return (
            <g
              key={g.guardId}
              className={interactive ? 'cursor-pointer' : ''}
              onClick={() => interactive && onSelectGuard?.(g.guardId)}
              onMouseEnter={() => setHover(g.guardId)}
              onMouseLeave={() => setHover(null)}
            >
              {g.status === 'EMERGENCY' && (
                <circle cx={g.p.x} cy={g.p.y} r="4" fill="#ef4444" opacity="0.35">
                  <animate attributeName="r" values="3;5.5;3" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              {selected && (
                <circle cx={g.p.x} cy={g.p.y} r="4.5" fill="none" stroke={color} strokeWidth="0.4" strokeDasharray="1 1" />
              )}
              {/* Accuracy halo */}
              <circle cx={g.p.x} cy={g.p.y} r={Math.min((g.accuracy || 0) / 4, 2.5)} fill={color} fillOpacity="0.15" />
              <circle cx={g.p.x} cy={g.p.y} r={r} fill={color} stroke="#0f172a" strokeWidth="0.4" filter="url(#glow)" />
              <circle cx={g.p.x} cy={g.p.y - r * 0.9} r="0.6" fill="#fff" />
              {(selected || isHover) && (
                <text x={g.p.x} y={g.p.y - r - 1.5} textAnchor="middle" fontSize="2" fill="#fff" fontWeight="600" fontFamily="ui-sans-serif, system-ui">
                  {g.guardName}
                </text>
              )}
            </g>
          )
        })}

        {/* Compass */}
        <g transform="translate(92, 8)" opacity="0.7">
          <circle r="3" fill="#0f172a" stroke="#475569" strokeWidth="0.2" />
          <path d="M 0 -2.2 L 0.6 0 L 0 0.6 L -0.6 0 Z" fill="#fbbf24" />
          <text x="0" y="-3.5" textAnchor="middle" fontSize="1.6" fill="#cbd5e1" fontWeight="700">N</text>
        </g>
      </svg>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/85 px-3 py-2 text-[10px] text-slate-300 backdrop-blur-sm ring-1 ring-white/10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Patrol</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> On Duty</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Current CP</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Emergency</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-500" /> Offline</span>
        </div>
      </div>
    </div>
  )
}
