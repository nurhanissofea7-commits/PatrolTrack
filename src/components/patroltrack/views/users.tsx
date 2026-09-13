'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type UserSummary } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState, StatCard } from '../shared'
import { GuardAvatar } from '../guard-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, UserPlus, UserCog, KeyRound, ShieldBan, ShieldCheck, Mail, Phone, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { SessionUser } from '@/lib/types'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  SUPERVISOR: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  GUARD: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
}

const AVATAR_COLORS = ['emerald', 'rose', 'amber', 'cyan', 'orange', 'fuchsia', 'violet']

export function UsersView({ currentUser }: { currentUser: SessionUser }) {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('ALL')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<UserSummary | null>(null)
  const [resetUser, setResetUser] = React.useState<UserSummary | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users })
  const users = data?.users ?? []

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.guard?.employeeId ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    supervisors: users.filter((u) => u.role === 'SUPERVISOR').length,
    guards: users.filter((u) => u.role === 'GUARD').length,
    disabled: users.filter((u) => u.status === 'DISABLED').length,
    locked: users.filter((u) => u.status === 'LOCKED').length,
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage accounts, roles and permissions.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <UserPlus className="mr-1.5 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Users" value={counts.total} icon={Users} tone="slate" />
        <StatCard label="Admins" value={counts.admins} icon={ShieldCheck} tone="violet" />
        <StatCard label="Supervisors" value={counts.supervisors} icon={Users} tone="emerald" />
        <StatCard label="Guards" value={counts.guards} icon={Users} tone="sky" />
        <StatCard label="Disabled" value={counts.disabled} icon={ShieldBan} tone="rose" />
        <StatCard label="Locked" value={counts.locked} icon={ShieldBan} tone="amber" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Administrators</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisors</SelectItem>
            <SelectItem value="GUARD">Security Guards</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : filtered.length === 0 ? (
        <SectionCard><EmptyState icon={Users} title="No users found" description="Try adjusting your search or filters." /></SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0">
          <ScrollArea className="h-[560px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser.id}
                  onEdit={() => setEditUser(u)}
                  onReset={() => setResetUser(u)}
                />
              ))}
            </div>
          </ScrollArea>
        </SectionCard>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} supervisors={users.filter((u) => u.role === 'SUPERVISOR' && u.supervisor).map((u) => ({ id: u.supervisor!.id, name: u.name }))} />
      {editUser && <EditUserDialog user={editUser} open onClose={() => setEditUser(null)} supervisors={users.filter((u) => u.role === 'SUPERVISOR' && u.supervisor).map((u) => ({ id: u.supervisor!.id, name: u.name }))} />}
      {resetUser && <ResetPasswordDialog user={resetUser} open onClose={() => setResetUser(null)} />}
    </div>
  )
}

function UserRow({ user, isSelf, onEdit, onReset }: {
  user: UserSummary; isSelf: boolean; onEdit: () => void; onReset: () => void
}) {
  const qc = useQueryClient()
  const [busy, setBusy] = React.useState(false)

  const toggleStatus = async () => {
    setBusy(true)
    try {
      const newStatus = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
      await api.updateUser(user.id, { status: newStatus })
      toast.success(`${user.name} ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}`)
      qc.invalidateQueries({ queryKey: ['users'] })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <GuardAvatar name={user.name} color={user.avatarColor} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
          {isSelf && <Badge variant="outline" className="text-[9px] text-slate-500">YOU</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
          {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
          {user.guard && <span>{user.guard.employeeId} · {user.guard.rank}</span>}
          {user.guard?.supervisor && <span>Sup: {user.guard.supervisor.name}</span>}
        </div>
      </div>
      <Badge className={cn('shrink-0', ROLE_COLORS[user.role])}>{user.role}</Badge>
      <StatusPill status={user.status} />
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onReset} title="Reset password">
          <KeyRound className="h-4 w-4 text-slate-500" />
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleStatus} disabled={busy || isSelf} title={user.status === 'DISABLED' ? 'Enable' : 'Disable'}>
          {user.status === 'DISABLED' ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldBan className="h-4 w-4 text-rose-500" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
          <UserCog className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    DISABLED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
    LOCKED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  }
  return <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline', map[status] ?? map.ACTIVE)}>{status}</span>
}

// ─── Create user dialog ─────────────────────────────────────────────────────
function CreateUserDialog({ open, onOpenChange, supervisors }: {
  open: boolean; onOpenChange: (o: boolean) => void; supervisors: { id: string; name: string }[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    name: '', email: '', password: '', role: 'GUARD', phone: '',
    rank: 'Officer', shift: 'DAY', supervisorId: '', licenseNumber: '',
    department: 'Operations', avatarColor: 'emerald',
  })

  const mutation = useMutation({
    mutationFn: () => api.createUser(form),
    onSuccess: () => {
      toast.success('User created')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['guards'] })
      onOpenChange(false)
      setForm({ name: '', email: '', password: '', role: 'GUARD', phone: '', rank: 'Officer', shift: 'DAY', supervisorId: '', licenseNumber: '', department: 'Operations', avatarColor: 'emerald' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new account with a specific role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@patroltrack.io" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+60..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GUARD">Security Guard</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Avatar Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, avatarColor: c })}
                  className={cn('h-7 w-7 rounded-full ring-2', form.avatarColor === c ? 'ring-slate-900 dark:ring-white' : 'ring-transparent',
                    c === 'emerald' && 'bg-emerald-500', c === 'rose' && 'bg-rose-500', c === 'amber' && 'bg-amber-500',
                    c === 'cyan' && 'bg-cyan-500', c === 'orange' && 'bg-orange-500', c === 'fuchsia' && 'bg-fuchsia-500', c === 'violet' && 'bg-violet-500')} />
              ))}
            </div>
          </div>

          {form.role === 'GUARD' && (
            <div className="space-y-3 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Guard Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rank</Label>
                  <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Shift</Label>
                  <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAY">Day</SelectItem>
                      <SelectItem value="NIGHT">Night</SelectItem>
                      <SelectItem value="ROTATING">Rotating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Assign Supervisor</Label>
                  <Select value={form.supervisorId || '__none__'} onValueChange={(v) => setForm({ ...form, supervisorId: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {supervisors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>License Number</Label>
                  <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="PSG-..." />
                </div>
              </div>
            </div>
          )}
          {form.role === 'SUPERVISOR' && (
            <div className="space-y-1.5 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.email || !form.password} className="bg-emerald-600 hover:bg-emerald-700">
            {mutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit user dialog ───────────────────────────────────────────────────────
function EditUserDialog({ user, open, onClose, supervisors }: {
  user: UserSummary; open: boolean; onClose: () => void; supervisors: { id: string; name: string }[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState<Record<string, any>>({})

  React.useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      avatarColor: user.avatarColor,
      status: user.status,
      rank: user.guard?.rank ?? 'Officer',
      shift: user.guard?.shift ?? 'DAY',
      supervisorId: user.guard?.supervisor?.id ?? '',
      licenseNumber: user.guard?.licenseNumber ?? '',
      department: user.supervisor?.department ?? 'Operations',
    })
  }, [user])

  const mutation = useMutation({
    mutationFn: () => api.updateUser(user.id, form),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['guards'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GuardAvatar name={user.name} color={user.avatarColor} size="sm" />
            Edit {user.name}
          </DialogTitle>
          <DialogDescription>Update account details, role and assignment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GUARD">Security Guard</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Avatar Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, avatarColor: c })}
                  className={cn('h-7 w-7 rounded-full ring-2', form.avatarColor === c ? 'ring-slate-900 dark:ring-white' : 'ring-transparent',
                    c === 'emerald' && 'bg-emerald-500', c === 'rose' && 'bg-rose-500', c === 'amber' && 'bg-amber-500',
                    c === 'cyan' && 'bg-cyan-500', c === 'orange' && 'bg-orange-500', c === 'fuchsia' && 'bg-fuchsia-500', c === 'violet' && 'bg-violet-500')} />
              ))}
            </div>
          </div>

          {form.role === 'GUARD' && (
            <div className="space-y-3 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Guard Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rank</Label>
                  <Input value={form.rank ?? ''} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Shift</Label>
                  <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAY">Day</SelectItem>
                      <SelectItem value="NIGHT">Night</SelectItem>
                      <SelectItem value="ROTATING">Rotating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Supervisor</Label>
                  <Select value={form.supervisorId || '__none__'} onValueChange={(v) => setForm({ ...form, supervisorId: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {supervisors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>License Number</Label>
                  <Input value={form.licenseNumber ?? ''} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          {form.role === 'SUPERVISOR' && (
            <div className="space-y-1.5 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <Label>Department</Label>
              <Input value={form.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Reset password dialog ──────────────────────────────────────────────────
function ResetPasswordDialog({ user, open, onClose }: { user: UserSummary; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')

  React.useEffect(() => { setPassword(''); setConfirm('') }, [user])

  const mutation = useMutation({
    mutationFn: () => api.resetPassword(user.id, password),
    onSuccess: () => {
      toast.success('Password reset')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-500" /> Reset Password</DialogTitle>
          <DialogDescription>Set a new password for {user.name}. This also unlocks the account if it was locked.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {password && confirm && password !== confirm && (
            <p className="text-xs text-rose-600">Passwords do not match.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || password.length < 6 || password !== confirm} className="bg-emerald-600 hover:bg-emerald-700">
            {mutation.isPending ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
