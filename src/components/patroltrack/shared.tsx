'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatCard({
  label, value, sub, icon: Icon, tone = 'slate', trend, hint,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'
  trend?: 'up' | 'down'
  hint?: string
}) {
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/20' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-300', ring: 'ring-slate-500/20' },
  }
  const t = tones[tone]
  return (
    <Card className={cn('relative overflow-hidden border-slate-200/70 dark:border-slate-800')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
            {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', t.bg, t.ring)}>
            <Icon className={cn('h-5 w-5', t.text)} />
          </div>
        </div>
        {(trend || hint) && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {trend && (trend === 'up' ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-3 w-3" /> trending up</span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400"><TrendingDown className="h-3 w-3" /> trending down</span>
            ))}
            {hint && <span className="text-slate-400">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SectionCard({
  title, description, action, children, className, bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={cn('border-slate-200/70 dark:border-slate-800', className)}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-0.5">
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className={bodyClassName}>{children}</CardContent>
    </Card>
  )
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
