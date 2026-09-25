'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { GuardAvatar } from '../guard-avatar'
import { PriorityBadge } from '../status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, Plus, ChevronRight } from 'lucide-react'
import { safeFormat as format, toDate } from '@/lib/dates'
import { format as rawFormat } from 'date-fns'
import { toast } from 'sonner'
import type { Schedule } from '@/lib/types'

export function SchedulesView() {
  const [open, setOpen] = React.useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: api.schedules })
  const schedules = data?.schedules ?? []

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Patrol Schedules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create and assign patrol schedules to guards.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1.5 h-4 w-4" /> New Schedule
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : schedules.length === 0 ? (
        <SectionCard>
          <EmptyState icon={CalendarClock} title="No schedules yet" description="Create your first patrol schedule." />
        </SectionCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {schedules.map((s) => <ScheduleCard key={s.id} schedule={s} />)}
        </div>
      )}

      <CreateScheduleDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const statusMap: Record<string, string> = {
    SCHEDULED: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
    IN_PROGRESS: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    COMPLETED: 'border-slate-300 bg-slate-500/5 text-slate-600 dark:text-slate-300',
    CANCELLED: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
    MISSED: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  }
  const start = toDate(schedule.startTime)
  const end = toDate(schedule.endTime)
  return (
    <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{schedule.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{schedule.routeName} · {schedule.checkpointCount} checkpoints</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMap[schedule.status] ?? statusMap.SCHEDULED}`}>{schedule.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {schedule.guardName ? (
          <>
            <GuardAvatar name={schedule.guardName} color={schedule.guardColor ?? 'emerald'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{schedule.guardName}</p>
              <p className="text-[11px] text-slate-400">Assigned guard</p>
            </div>
          </>
        ) : (
          <Badge variant="outline" className="border-amber-500/30 text-amber-700">Unassigned</Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Date</p>
          <p className="font-medium text-slate-700 dark:text-slate-200">{start ? format(start, 'dd MMM yyyy') : '—'}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Time</p>
          <p className="font-medium text-slate-700 dark:text-slate-200">{start && end ? `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}` : '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={schedule.priority} />
        <Badge variant="outline" className="text-[10px]">{schedule.frequency.replace(/_/g, ' ')}</Badge>
      </div>

      {schedule.instructions && (
        <p className="mt-3 line-clamp-2 rounded-md bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
          📋 {schedule.instructions}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {schedule.checkpoints.slice(0, 6).map((c) => (
          <span key={c.id} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.code}</span>
        ))}
        {schedule.checkpoints.length > 6 && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800">+{schedule.checkpoints.length - 6}</span>}
      </div>
    </div>
  )
}

function CreateScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const { data: routesData } = useQuery({ queryKey: ['routes'], queryFn: api.routes })
  const { data: guardsData } = useQuery({ queryKey: ['guards'], queryFn: api.guards })

  const [form, setForm] = React.useState({
    name: '', routeId: '', guardId: '', date: '', startTime: '', endTime: '',
    priority: 'NORMAL', instructions: '',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const dateStr = form.date || rawFormat(new Date(), 'yyyy-MM-dd')
      return api.createSchedule({
        name: form.name || `Patrol — ${routesData?.routes.find((r) => r.id === form.routeId)?.name ?? 'Route'}`,
        routeId: form.routeId,
        guardId: form.guardId || undefined,
        date: new Date(dateStr),
        startTime: new Date(`${dateStr}T${form.startTime || '22:00'}`),
        endTime: new Date(`${dateStr}T${form.endTime || '23:00'}`),
        priority: form.priority,
        instructions: form.instructions || undefined,
      } as any)
    },
    onSuccess: () => {
      toast.success('Schedule created')
      qc.invalidateQueries({ queryKey: ['schedules'] })
      onOpenChange(false)
      setForm({ name: '', routeId: '', guardId: '', date: '', startTime: '', endTime: '', priority: 'NORMAL', instructions: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Patrol Schedule</DialogTitle>
          <DialogDescription>Assign a guard to a route with a date and time window.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Schedule Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Night Patrol – Block A" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patrol Route</Label>
              <Select value={form.routeId} onValueChange={(v) => setForm({ ...form, routeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {routesData?.routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.checkpointCount} CPs)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign Guard</Label>
              <Select value={form.guardId} onValueChange={(v) => setForm({ ...form, guardId: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {guardsData?.guards.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Special Instructions</Label>
            <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} placeholder="Notes for the guard..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.routeId || mutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {mutation.isPending ? 'Creating...' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
