// Shared date helpers that safely handle Firestore Timestamps, ISO strings, and Date objects
import { format as fnsFormat, formatDistanceToNow as fnsFormatDistance } from 'date-fns'

// Convert any date-like value to a JS Date, or null if invalid
export function toDate(date: any): Date | null {
  if (!date) return null
  try {
    let d: Date
    if (typeof date === 'string') d = new Date(date)
    else if (date instanceof Date) d = date
    else if (typeof date === 'object' && (date.seconds !== undefined || date._seconds !== undefined)) {
      const s = date._seconds ?? date.seconds
      const ns = date._nanoseconds ?? date.nanoseconds ?? 0
      d = new Date(s * 1000 + ns / 1e6)
    } else if (typeof date?.toDate === 'function') d = date.toDate()
    else d = new Date(date)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

// Safely format a date — returns fallback if invalid
export function safeFormat(date: any, formatStr: string, fallback = '—'): string {
  const d = toDate(date)
  if (!d) return fallback
  try {
    return fnsFormat(d, formatStr)
  } catch {
    return fallback
  }
}

// Safely format distance to now
export function safeDistanceToNow(date: any, fallback = 'unknown'): string {
  const d = toDate(date)
  if (!d) return fallback
  try {
    return fnsFormatDistance(d, { addSuffix: true })
  } catch {
    return fallback
  }
}
