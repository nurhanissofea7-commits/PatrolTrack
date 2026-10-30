'use client'
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, EmptyState, LoadingState } from '../shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { MapPinned, Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PatrolRoute, Checkpoint, SessionUser } from '@/lib/types'

export function CheckpointsView({ currentUser }: { currentUser: SessionUser }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['routes'], queryFn: api.routes })
  const routes = data?.routes ?? []
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null)
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null

  const [showAddRoute, setShowAddRoute] = React.useState(false)
  const [showAddCheckpoint, setShowAddCheckpoint] = React.useState(false)
  const [editRoute, setEditRoute] = React.useState<PatrolRoute | null>(null)
  const [editCheckpoint, setEditCheckpoint] = React.useState<Checkpoint | null>(null)
  const [deleteRouteId, setDeleteRouteId] = React.useState<string | null>(null)
  const [deleteCheckpointId, setDeleteCheckpointId] = React.useState<string | null>(null)

  const isAdmin = currentUser.role === 'ADMIN'

  const routeMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await api.createRoute({
        name: body.name, description: body.description || null,
        estimatedDurationMin: 60, estimatedDistanceM: 500, startLat: 3.139, startLng: 101.6869,
      })
      if (body.checkpoints && body.checkpoints.length > 0) {
        for (let i = 0; i < body.checkpoints.length; i++) {
          const cp = body.checkpoints[i]
          if (cp.code && cp.name) {
            await api.createCheckpoint({
              code: cp.code, name: cp.name, routeId: (res as any).route.id,
              lat: 3.139, lng: 101.6869, radiusM: 20, sequence: i + 1, expectedWindowMin: 15, description: null,
            })
          }
        }
      }
      return res
    },
    onSuccess: () => { toast.success('Route created with checkpoints'); qc.invalidateQueries({ queryKey: ['routes'] }); setShowAddRoute(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const checkpointMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createCheckpoint(body),
    onSuccess: () => { toast.success('Checkpoint created'); qc.invalidateQueries({ queryKey: ['routes'] }); setShowAddCheckpoint(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editRouteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.updateRoute(id, body),
    onSuccess: () => { toast.success('Route updated'); qc.invalidateQueries({ queryKey: ['routes'] }); setEditRoute(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editCheckpointMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.updateCheckpoint(id, body),
    onSuccess: () => { toast.success('Checkpoint updated'); qc.invalidateQueries({ queryKey: ['routes'] }); setEditCheckpoint(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteRouteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => { toast.success('Route deleted'); qc.invalidateQueries({ queryKey: ['routes'] }); setDeleteRouteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteCheckpointMutation = useMutation({
    mutationFn: (id: string) => api.deleteCheckpoint(id),
    onSuccess: () => { toast.success('Checkpoint deleted'); qc.invalidateQueries({ queryKey: ['routes'] }); setDeleteCheckpointId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Checkpoints & Routes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage patrol routes and their checkpoint sequences.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setShowAddRoute(true)} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Route
            </Button>
            {selectedRoute && (
              <Button onClick={() => setShowAddCheckpoint(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1.5 h-4 w-4" /> Add Checkpoint
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : routes.length === 0 ? (
        <SectionCard><EmptyState icon={MapPinned} title="No routes" /></SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Patrol Routes" description={`${routes.length} routes`} bodyClassName="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1.5 p-3">
                {routes.map((r) => (
                  <div key={r.id} className={cn('group flex items-center gap-2 rounded-lg border p-3 transition-colors', (selectedRoute?.id === r.id) ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50')}>
                    <button onClick={() => setSelectedRouteId(r.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <MapPinned className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-[11px] text-slate-500">{r.checkpointCount} checkpoints</p>
                      </div>
                    </button>
                    {isAdmin && (
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setEditRoute(r)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteRouteId(r.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SectionCard>

          {selectedRoute && (
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title={selectedRoute.name} description={selectedRoute.description ?? selectedRoute.location}>
                <div className="grid gap-3 sm:grid-cols-1">
                  <InfoTile icon={MapPinned} label="Checkpoints" value={String(selectedRoute.checkpointCount)} />
                </div>
              </SectionCard>

              <SectionCard title="Checkpoint Sequence" description="Ordered list of checkpoints on this route">
                <div className="space-y-2">
                  {selectedRoute.checkpoints.map((c, i) => (
                    <CheckpointRow key={c.id} cp={c} index={i} isLast={i === selectedRoute.checkpoints.length - 1} isAdmin={isAdmin} onEdit={() => setEditCheckpoint(c)} onDelete={() => setDeleteCheckpointId(c.id)} />
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}

      {showAddRoute && <AddRouteDialog open={showAddRoute} onOpenChange={setShowAddRoute} onSubmit={(body) => routeMutation.mutate(body)} isLoading={routeMutation.isPending} />}
      {showAddCheckpoint && selectedRoute && <AddCheckpointDialog open={showAddCheckpoint} onOpenChange={setShowAddCheckpoint} routeId={selectedRoute.id} routeName={selectedRoute.name} nextSequence={(selectedRoute.checkpoints.length + 1)} onSubmit={(body) => checkpointMutation.mutate(body)} isLoading={checkpointMutation.isPending} />}
      {editRoute && <EditRouteDialog route={editRoute} onSubmit={(body) => editRouteMutation.mutate({ id: editRoute.id, body })} onClose={() => setEditRoute(null)} isLoading={editRouteMutation.isPending} />}
      {editCheckpoint && <EditCheckpointDialog checkpoint={editCheckpoint} onSubmit={(body) => editCheckpointMutation.mutate({ id: editCheckpoint.id, body })} onClose={() => setEditCheckpoint(null)} isLoading={editCheckpointMutation.isPending} />}

      {deleteRouteId && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteRouteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this route?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the route AND all its checkpoints. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteRouteMutation.mutate(deleteRouteId)} className="bg-rose-600 hover:bg-rose-700">{deleteRouteMutation.isPending ? 'Deleting...' : 'Delete Route'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {deleteCheckpointId && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteCheckpointId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this checkpoint?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the checkpoint from the route. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteCheckpointMutation.mutate(deleteCheckpointId)} className="bg-rose-600 hover:bg-rose-700">{deleteCheckpointMutation.isPending ? 'Deleting...' : 'Delete Checkpoint'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function AddRouteDialog({ open, onOpenChange, onSubmit, isLoading }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (body: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = React.useState({ name: '', description: '' })
  const [checkpoints, setCheckpoints] = React.useState<{ code: string; name: string }[]>([{ code: '', name: '' }])
  const addRow = () => setCheckpoints([...checkpoints, { code: '', name: '' }])
  const removeRow = (i: number) => setCheckpoints(checkpoints.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: 'code' | 'name', value: string) => { const u = [...checkpoints]; u[i] = { ...u[i], [field]: value }; setCheckpoints(u) }
  const handleSubmit = () => onSubmit({ name: form.name, description: form.description || null, checkpoints: checkpoints.filter((c) => c.code && c.name) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Patrol Route</DialogTitle><DialogDescription>Create a route and add its checkpoints all at once.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Route Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Night Patrol – Block C" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the route..." rows={2} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Checkpoints</Label><Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-3.5 w-3.5" /> Add Checkpoint</Button></div>
            <div className="space-y-2">
              {checkpoints.map((cp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{index + 1}</div>
                  <Input value={cp.code} onChange={(e) => updateRow(index, 'code', e.target.value)} placeholder="Code (e.g. C-CP01)" className="w-32 text-xs" />
                  <Input value={cp.name} onChange={(e) => updateRow(index, 'name', e.target.value)} placeholder="Name (e.g. Main Entrance)" className="flex-1 text-xs" />
                  {checkpoints.length > 1 && <button type="button" onClick={() => removeRow(index)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={!form.name || isLoading} className="bg-emerald-600 hover:bg-emerald-700">{isLoading ? 'Creating...' : 'Create Route'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditRouteDialog({ route, onSubmit, onClose, isLoading }: { route: PatrolRoute; onSubmit: (body: Record<string, unknown>) => void; onClose: () => void; isLoading: boolean }) {
  const [name, setName] = React.useState(route.name)
  const [description, setDescription] = React.useState(route.description || '')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Route</DialogTitle><DialogDescription>Update the route name and description.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Route Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit({ name, description: description || null })} disabled={!name || isLoading} className="bg-emerald-600 hover:bg-emerald-700">{isLoading ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCheckpointDialog({ checkpoint, onSubmit, onClose, isLoading }: { checkpoint: Checkpoint; onSubmit: (body: Record<string, unknown>) => void; onClose: () => void; isLoading: boolean }) {
  const [code, setCode] = React.useState(checkpoint.code)
  const [name, setName] = React.useState(checkpoint.name)
  const [description, setDescription] = React.useState(checkpoint.description || '')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Checkpoint</DialogTitle><DialogDescription>Update the checkpoint code and name.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Checkpoint Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Checkpoint Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit({ code, name, description: description || null })} disabled={!code || !name || isLoading} className="bg-emerald-600 hover:bg-emerald-700">{isLoading ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddCheckpointDialog({ open, onOpenChange, routeId, routeName, nextSequence, onSubmit, isLoading }: { open: boolean; onOpenChange: (o: boolean) => void; routeId: string; routeName: string; nextSequence: number; onSubmit: (body: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = React.useState({ code: '', name: '', description: '' })
  const handleSubmit = () => onSubmit({ code: form.code, name: form.name, routeId, lat: 3.139, lng: 101.6869, radiusM: 20, expectedWindowMin: 15, description: form.description || null })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Checkpoint</DialogTitle><DialogDescription>Add a checkpoint to "{routeName}". It will be sequence #{nextSequence}.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Checkpoint Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. A-CP09" /></div>
            <div className="space-y-1.5"><Label>Checkpoint Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Roof Access" /></div>
          </div>
          <div className="space-y-1.5"><Label>Description (optional)</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={!form.code || !form.name || isLoading} className="bg-emerald-600 hover:bg-emerald-700">{isLoading ? 'Creating...' : 'Add Checkpoint'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <div><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p></div>
    </div>
  )
}

function CheckpointRow({ cp, index, isLast, isAdmin, onEdit, onDelete }: { cp: Checkpoint; index: number; isLast: boolean; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{cp.sequence}</div>
        {!isLast && <div className="my-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />}
      </div>
      <div className="group flex flex-1 items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{cp.code}</Badge>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{cp.name}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  )
}