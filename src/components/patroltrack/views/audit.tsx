'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollText, User, Calendar, Globe, Monitor } from 'lucide-react'
import { safeFormat as format } from '@/lib/dates'
import type { AuditLog } from '@/lib/types'

const ACTION_TONE: Record<string, string> = {
  USER_LOGIN: 'text-emerald-600 bg-emerald-500/10',
  LOGIN_FAILED: 'text-rose-600 bg-rose-500/10',
  PATROL_START: 'text-emerald-600 bg-emerald-500/10',
  PATROL_END: 'text-emerald-600 bg-emerald-500/10',
  CHECKPOINT_VERIFIED: 'text-emerald-600 bg-emerald-500/10',
  CHECKPOINT_REJECTED: 'text-rose-600 bg-rose-500/10',
  CHECKPOINT_MISSED: 'text-amber-600 bg-amber-500/10',
  INCIDENT_SUBMIT: 'text-amber-600 bg-amber-500/10',
  SOS_ACTIVATED: 'text-rose-600 bg-rose-500/10',
  SOS_RESOLVED: 'text-emerald-600 bg-emerald-500/10',
  SCHEDULE_CREATE: 'text-sky-600 bg-sky-500/10',
  SETTINGS_UPDATE: 'text-violet-600 bg-violet-500/10',
  USER_MODIFY: 'text-violet-600 bg-violet-500/10',
}

export function AuditView() {
  const { data, isLoading } = useQuery({ queryKey: ['audit'], queryFn: api.audit })
  const logs = data?.logs ?? []

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">System activity and security event records.</p>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : logs.length === 0 ? (
        <SectionCard><EmptyState icon={ScrollText} title="No audit logs" /></SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0">
          <ScrollArea className="h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900">
                <TableRow>
                  <TableHead className="w-[180px]">Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[140px]">IP / Device</TableHead>
                  <TableHead className="w-[150px] text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${ACTION_TONE[l.action] ?? 'text-slate-600 bg-slate-500/10'}`}>
                        {l.action.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">{l.userName}</TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-xs text-slate-600 dark:text-slate-300">{l.details}</span>
                      {l.entity && <Badge variant="outline" className="ml-2 text-[9px]">{l.entity}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-[10px] text-slate-400">
                        {l.ip && <p className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" />{l.ip}</p>}
                        {l.deviceInfo && <p className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" />{l.deviceInfo.slice(0, 24)}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-500">{format(l.createdAt, 'dd MMM, HH:mm:ss')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </SectionCard>
      )}
    </div>
  )
}
