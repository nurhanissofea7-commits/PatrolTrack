'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionCard, LoadingState, StatCard } from '../shared'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { BarChart3, CheckCircle2, AlertTriangle, Clock, Gauge, TrendingUp, Activity } from 'lucide-react'

export function AnalyticsView() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics })

  if (isLoading || !data) {
    return <div className="p-6"><LoadingState rows={6} /></div>
  }

  const s = data.summary
  const dailyData = data.daily.map((d) => ({ date: d.date.slice(5), patrols: d.patrols, incidents: d.incidents }))
  const verData = [
    { name: 'Verified', value: data.verifications.verified, fill: 'var(--color-verified)' },
    { name: 'Flagged', value: data.verifications.flagged, fill: 'var(--color-flagged)' },
    { name: 'Missed', value: data.verifications.missed, fill: 'var(--color-missed)' },
    { name: 'Rejected', value: data.verifications.rejected, fill: 'var(--color-rejected)' },
  ]
  const incidentData = Object.entries(data.incidentTypes).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))

  const dailyConfig: ChartConfig = {
    patrols: { label: 'Patrols', color: '#10b981' },
    incidents: { label: 'Incidents', color: '#f43f5e' },
  }
  const verConfig: ChartConfig = {
    verified: { label: 'Verified', color: '#10b981' },
    flagged: { label: 'Flagged', color: '#f59e0b' },
    missed: { label: 'Missed', color: '#a1a1aa' },
    rejected: { label: 'Rejected', color: '#ef4444' },
  }
  const incidentColors = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#14b8a6', '#eab308']

  const maxPatrols = Math.max(...data.guardPerformance.map((g) => g.patrols), 1)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Patrol Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Performance metrics and operational insights.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Completion Rate" value={`${s.completionRate}%`} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Verification Success" value={`${s.verificationSuccessRate}%`} icon={Gauge} tone="emerald" />
        <StatCard label="Missed Rate" value={`${s.missedRate}%`} icon={AlertTriangle} tone="rose" />
        <StatCard label="Late Rate" value={`${s.lateRate}%`} icon={Clock} tone="amber" />
        <StatCard label="Avg Duration" value={`${s.avgDurationMin}m`} icon={Activity} tone="sky" />
        <StatCard label="Incidents" value={s.incidentCount} icon={TrendingUp} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily patrols & incidents */}
        <SectionCard title="Daily Patrols & Incidents" description="Last 7 days">
          <ChartContainer config={dailyConfig} className="h-[280px] w-full">
            <AreaChart data={dailyData} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="patrolGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="patrols" type="monotone" stroke="#10b981" strokeWidth={2} fill="url(#patrolGrad)" />
              <Area dataKey="incidents" type="monotone" stroke="#f43f5e" strokeWidth={2} fill="url(#incGrad)" />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </SectionCard>

        {/* Verification outcomes */}
        <SectionCard title="Checkpoint Verification Outcomes" description="All checkpoint submissions">
          <ChartContainer config={verConfig} className="h-[280px] w-full">
            <BarChart data={verData} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        {/* Guard performance */}
        <SectionCard title="Guard Performance" description="Patrols completed per guard">
          <div className="space-y-3">
            {data.guardPerformance.map((g) => (
              <div key={g.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{g.name}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="text-emerald-600">{g.completed}/{g.patrols} done</span>
                    <span className="text-amber-600">{g.checkpoints} CPs</span>
                    {g.incidents > 0 && <span className="text-rose-600">{g.incidents} inc</span>}
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(g.patrols / maxPatrols) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Incident types */}
        <SectionCard title="Incident Type Breakdown" description="Distribution of reported incidents">
          {incidentData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No incidents reported</p>
          ) : (
            <ChartContainer config={{}} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={incidentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {incidentData.map((_, i) => <Cell key={i} fill={incidentColors[i % incidentColors.length]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {incidentData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: incidentColors[i % incidentColors.length] }} />
                <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
