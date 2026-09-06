'use client'
import { cn } from '@/lib/utils'
import { GUARD_STATUS_META } from '@/lib/patrol'

export function StatusDot({ status, className }: { status: string; className?: string }) {
  const meta = GUARD_STATUS_META[status] ?? GUARD_STATUS_META.OFF_DUTY
  return <span className={cn('inline-block h-2 w-2 rounded-full', meta.dot, className)} />
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = GUARD_STATUS_META[status] ?? GUARD_STATUS_META.OFF_DUTY
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.badge, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-500/15 text-red-700 dark:text-red-300',
    HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    NORMAL: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    LOW: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  }
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[priority] ?? map.NORMAL)}>{priority}</span>
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-red-500/15 text-red-700 dark:text-red-300',
    MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    LOW: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  }
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', map[severity] ?? map.LOW)}>{severity}</span>
}

export function TimingBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ON_TIME: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    EARLY: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    LATE: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    MISSED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  }
  const labels: Record<string, string> = { ON_TIME: 'On Time', EARLY: 'Early', LATE: 'Late', MISSED: 'Missed' }
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', map[status] ?? map.ON_TIME)}>{labels[status] ?? status}</span>
}

export function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    VERIFIED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-300',
    FLAGGED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    MISSED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  }
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', map[status] ?? map.VERIFIED)}>{status}</span>
}
