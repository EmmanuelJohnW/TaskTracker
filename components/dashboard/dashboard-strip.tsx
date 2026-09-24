"use client"

import { AlertTriangleIcon, CalendarClockIcon, CheckCircle2Icon } from "lucide-react"
import { cn } from "cn"
import { useMemo } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { ColorDot } from "@/components/task/task-meta"
import { useFilters } from "@/hooks/use-filters"
import type { DueFilter } from "@/lib/tasks/filters"
import { computeStats, type WorkspaceSplit } from "@/lib/tasks/stats"

export function DashboardStrip({ now }: { now: Date }) {
  const { tasks, workspaces } = useAppData()
  const { filters, setFilters } = useFilters()
  const stats = useMemo(() => computeStats(tasks, workspaces, now), [tasks, workspaces, now])

  const toggleDue = (due: DueFilter) => setFilters({ due: filters.due === due ? null : due })

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <StatTile
        label="Overdue"
        value={stats.overdue}
        icon={<AlertTriangleIcon className="size-4" />}
        tone={stats.overdue > 0 ? "text-red-500" : "text-muted-foreground"}
        active={filters.due === "overdue"}
        onClick={() => toggleDue("overdue")}
      />
      <StatTile
        label="Due this week"
        value={stats.dueThisWeek}
        icon={<CalendarClockIcon className="size-4" />}
        tone="text-amber-500"
        active={filters.due === "week"}
        onClick={() => toggleDue("week")}
      />
      <StatTile
        label="Done this week"
        value={stats.doneThisWeek}
        icon={<CheckCircle2Icon className="size-4" />}
        tone="text-emerald-500"
      />
      <SplitTile split={stats.split} total={stats.openTotal} />
    </div>
  )
}

interface StatTileProps {
  label: string
  value: number
  icon: React.ReactNode
  tone: string
  active?: boolean
  onClick?: () => void
}

function StatTile({ label, value, icon, tone, active, onClick }: StatTileProps) {
  const content = (
    <>
      <span className={cn("flex items-center gap-1.5 text-xs text-muted-foreground")}>
        <span className={tone}>{icon}</span>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </>
  )
  const className = cn(
    "flex flex-col items-start gap-0.5 rounded-xl border bg-card px-3 py-2 text-left",
    active && "border-primary/60 ring-1 ring-primary/30"
  )
  if (!onClick) return <div className={className}>{content}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(className, "transition-colors hover:border-foreground/20")}
    >
      {content}
    </button>
  )
}

function SplitTile({ split, total }: { split: WorkspaceSplit[]; total: number }) {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-xl border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">Open tasks · {total}</span>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        {split.map(({ workspace, openCount }) =>
          openCount > 0 ? (
            <div
              key={workspace.id}
              style={{ width: `${(openCount / total) * 100}%`, backgroundColor: workspace.color }}
            />
          ) : null
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {split.map(({ workspace, openCount }) => (
          <li key={workspace.id} className="flex items-center gap-1">
            <ColorDot color={workspace.color} />
            <span className="text-muted-foreground">{workspace.name}</span>
            <span className="tabular-nums">{openCount}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
