'use client'
import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, MapPin, ClipboardList, CalendarClock, MapPinned, Users,
  AlertTriangle, FileText, BarChart3, Bell, ScrollText, Settings, Shield,
  Menu, X, Moon, Sun, LogOut, ChevronDown, Smartphone, UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import type { SessionUser } from '@/lib/types'

export type ViewId =
  | 'dashboard' | 'live' | 'patrols' | 'schedules' | 'checkpoints'
  | 'guards' | 'incidents' | 'reports' | 'analytics'
  | 'notifications' | 'audit' | 'users' | 'settings'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Tracking', icon: MapPin },
  { id: 'patrols', label: 'Patrol Management', icon: ClipboardList },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'checkpoints', label: 'Checkpoints', icon: MapPinned },
  { id: 'guards', label: 'Guards', icon: Users },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
  { id: 'users', label: 'User Management', icon: UserCog, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
]

const VIEW_LABELS: Record<ViewId, string> = {
  dashboard: 'Operations Dashboard',
  live: 'Live Guard Tracking',
  patrols: 'Patrol Management',
  schedules: 'Patrol Schedules',
  checkpoints: 'Checkpoints & Routes',
  guards: 'Security Guards',
  incidents: 'Incident Reports',
  reports: 'Digital Patrol Reports',
  analytics: 'Patrol Analytics',
  notifications: 'Notifications',
  audit: 'Audit Logs',
  users: 'User Management',
  settings: 'System Settings',
}

export function AppShell({
  user,
  view,
  setView,
  unreadCount,
  onLogout,
  onOpenGuardApp,
  children,
}: {
  user: SessionUser
  view: ViewId
  setView: (v: ViewId) => void
  unreadCount: number
  onLogout: () => void
  onOpenGuardApp: () => void
  children: React.ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const items = NAV.filter((n) => !n.adminOnly || user.role === 'ADMIN')
  const activeLabel = VIEW_LABELS[view]

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
          <Shield className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-white">PatrolTrack</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">Security Ops</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id)
                setMobileOpen(false)
              }}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
          <Avatar className="h-9 w-9 border border-emerald-500/30">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              {user.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-slate-100">{user.name}</span>
            <span className="truncate text-xs text-slate-400">{user.role.toLowerCase()}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-slate-900 lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900 shadow-2xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur-md dark:bg-slate-900/80 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{activeLabel}</h1>
            <Badge variant="outline" className="hidden border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 sm:inline-flex">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGuardApp}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Smartphone className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Guard App</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-700 text-xs font-semibold dark:text-emerald-300">
                    {user.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('notifications')}>
                <Bell className="mr-2 h-4 w-4" /> Notifications
                {unreadCount > 0 && <Badge className="ml-auto bg-rose-500 text-white">{unreadCount}</Badge>}
              </DropdownMenuItem>
              {user.role === 'ADMIN' && (
                <DropdownMenuItem onClick={() => setView('settings')}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-rose-600 focus:text-rose-600">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
