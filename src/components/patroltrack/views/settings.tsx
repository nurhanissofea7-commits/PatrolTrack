'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, LoadingState } from '../shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Settings, Shield, Radio, Building2, Clock, Megaphone, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { SessionUser } from '@/lib/types'

export function SettingsView({ user }: { user: SessionUser }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const settings = data?.settings ?? {}

  const { data: annData } = useQuery({ queryKey: ['announcements'], queryFn: api.announcements })
  const announcements = annData?.announcements ?? []

  const [form, setForm] = React.useState<Record<string, string>>({})
  React.useEffect(() => { if (data) setForm(data.settings) }, [data])

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, string>) => api.updateSettings(body),
    onSuccess: () => {
      toast.success('Settings saved')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [newAnn, setNewAnn] = React.useState({ title: '', body: '', audience: 'ALL' })
  const annMutation = useMutation({
    mutationFn: () => api.createAnnouncement(newAnn),
    onSuccess: () => {
      toast.success('Announcement posted')
      qc.invalidateQueries({ queryKey: ['announcements'] })
      setNewAnn({ title: '', body: '', audience: 'ALL' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="p-6"><LoadingState rows={4} /></div>

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure patrol verification rules and organization details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification rules */}
        <SectionCard title="Checkpoint Verification Rules" description="Anti-tampering and validation thresholds">
          <div className="space-y-4">
            <SettingRow icon={Radio} label="Default Geofence Radius" hint="Meters allowed from checkpoint center">
              <Input type="number" value={form['checkpoint.radius.default'] ?? ''} onChange={(e) => setForm({ ...form, 'checkpoint.radius.default': e.target.value })} className="w-24" />
              <span className="text-xs text-slate-400">meters</span>
            </SettingRow>
            <SettingRow icon={Shield} label="Auto-Flag Speed Threshold" hint="Flag impossible travel above this speed">
              <Input type="number" value={form['patrol.autoFlag.speedKmh'] ?? ''} onChange={(e) => setForm({ ...form, 'patrol.autoFlag.speedKmh': e.target.value })} className="w-24" />
              <span className="text-xs text-slate-400">km/h</span>
            </SettingRow>
            <SettingRow icon={Shield} label="SOS Confirmation Required" hint="Require hold-to-confirm before SOS activation">
              <Switch checked={form['patrol.sos.requireConfirm'] === 'true'} onCheckedChange={(v) => setForm({ ...form, 'patrol.sos.requireConfirm': String(v) })} />
            </SettingRow>
            <SettingRow icon={Clock} label="Max Failed Logins" hint="Lock account after this many failed attempts">
              <Input type="number" value={form['auth.maxFailedLogins'] ?? ''} onChange={(e) => setForm({ ...form, 'auth.maxFailedLogins': e.target.value })} className="w-24" />
              <span className="text-xs text-slate-400">attempts</span>
            </SettingRow>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="mr-1.5 h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </SectionCard>

        {/* Organization */}
        <SectionCard title="Organization" description="Organizational details">
          <div className="space-y-4">
            <SettingRow icon={Building2} label="Organization Name">
              <Input value={form['org.name'] ?? ''} onChange={(e) => setForm({ ...form, 'org.name': e.target.value })} className="w-56" />
            </SettingRow>
            <SettingRow icon={Clock} label="Timezone">
              <Input value={form['org.timezone'] ?? ''} onChange={(e) => setForm({ ...form, 'org.timezone': e.target.value })} className="w-56" />
            </SettingRow>
            <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> Save
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Announcements */}
      <SectionCard title="Announcements" description="Broadcast messages to guards and supervisors">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-3">
              <Input placeholder="Announcement title" value={newAnn.title} onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })} />
              <Textarea placeholder="Message to broadcast..." value={newAnn.body} onChange={(e) => setNewAnn({ ...newAnn, body: e.target.value })} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Audience</Label>
              <select value={newAnn.audience} onChange={(e) => setNewAnn({ ...newAnn, audience: e.target.value })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="ALL">All staff</option>
                <option value="GUARD">Guards</option>
                <option value="SUPERVISOR">Supervisors</option>
                <option value="ADMIN">Admins</option>
              </select>
              <Button onClick={() => annMutation.mutate()} disabled={!newAnn.title || !newAnn.body || annMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Megaphone className="mr-1.5 h-4 w-4" /> Post
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No announcements yet.</p>
            ) : announcements.map((a) => (
              <Card key={a.id} className="border-slate-200/70 dark:border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                    <Badge variant="outline" className="text-[10px]">{a.audience}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">— {a.authorName}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function SettingRow({ icon: Icon, label, hint, children }: { icon: React.ComponentType<{ className?: string }>; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><Icon className="h-4 w-4 text-slate-500" /></div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
          {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
