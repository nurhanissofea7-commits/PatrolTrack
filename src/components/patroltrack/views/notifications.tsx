'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, Siren, AlertTriangle, ClipboardCheck, Clock, ShieldCheck, Radio, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { safeDistanceToNow } from '@/lib/dates'
import { toast } from 'sonner'
import type { AppNotification } from '@/lib/types'

const TYPE_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  SOS: { icon: Siren, color: 'text-rose-600 bg-rose-500/15' },
  INCIDENT: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-500/15' },
  MISSED_CHECKPOINT: { icon: AlertTriangle, color: 'text-rose-600 bg-rose-500/15' },
  LATE_CHECKPOINT: { icon: Clock, color: 'text-amber-600 bg-amber-500/15' },
  INVALID_VERIFICATION: { icon: ShieldCheck, color: 'text-rose-600 bg-rose-500/15' },
  SUSPICIOUS: { icon: ShieldCheck, color: 'text-amber-600 bg-amber-500/15' },
  PATROL_STARTING: { icon: Radio, color: 'text-sky-600 bg-sky-500/15' },
  PATROL_COMPLETE: { icon: ClipboardCheck, color: 'text-emerald-600 bg-emerald-500/15' },
  GUARD_OFFLINE: { icon: Radio, color: 'text-slate-500 bg-slate-500/15' },
  ANNOUNCEMENT: { icon: Volume2, color: 'text-violet-600 bg-violet-500/15' },
}

export function NotificationsView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications })
  const notifications = data?.notifications ?? []
  const unread = notifications.filter((n) => !n.read)

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = async () => {
    await Promise.all(unread.map((n) => api.markRead(n.id)))
    qc.invalidateQueries({ queryKey: ['notifications'] })
    toast.success('All notifications marked as read')
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{unread.length} unread of {notifications.length} total</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : notifications.length === 0 ? (
        <SectionCard><EmptyState icon={Bell} title="No notifications" /></SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0">
          <ScrollArea className="h-[640px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => {
                const meta = TYPE_ICON[n.type] ?? TYPE_ICON.ANNOUNCEMENT
                const Icon = meta.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markReadMutation.mutate(n.id)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3.5 transition-colors',
                      !n.read ? 'bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm', !n.read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-200')}>{n.title}</p>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{safeDistanceToNow(n.createdAt)}</span>
                        <span>·</span>
                        <span className="uppercase tracking-wider">{n.priority}</span>
                        <span>·</span>
                        <span>{n.audience}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </SectionCard>
      )}
    </div>
  )
}
