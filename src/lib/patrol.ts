// PatrolTrack – shared map helpers + types
export const CAMPUS = { lat: 3.1390, lng: 101.6869 }

// Bounding box of our stylized campus (used to normalise lat/lng → 0..100 SVG space)
export const MAP_BOUNDS = {
  minLat: 3.1378,
  maxLat: 3.1405,
  minLng: 101.6858,
  maxLng: 101.6885,
}

export function projectToMap(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100
  const y = (1 - (lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100
  return { x, y }
}

// Haversine distance in meters
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function avatarColorClasses(color: string) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  }
  return map[color] || map.emerald
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

export const GUARD_STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  ON_PATROL: { label: 'Active Patrol', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  ON_DUTY: { label: 'On Duty', dot: 'bg-sky-500', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  OFF_DUTY: { label: 'Off Duty', dot: 'bg-zinc-400', badge: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300' },
  BREAK: { label: 'On Break', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  EMERGENCY: { label: 'Emergency', dot: 'bg-red-500', badge: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  DELAYED: { label: 'Delayed', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  OFFLINE: { label: 'Offline', dot: 'bg-zinc-300', badge: 'bg-zinc-400/15 text-zinc-500 dark:text-zinc-400' },
}
