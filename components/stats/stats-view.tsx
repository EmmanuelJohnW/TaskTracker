"use client"

import { CheckCircle2Icon, FlameIcon, TargetIcon, TrophyIcon } from "lucide-react"
import { useMemo } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { ActivityHeatmap } from "@/components/stats/activity-heatmap"
import { BreakdownBars } from "@/components/stats/breakdown-bars"
import { RecentCompletions } from "@/components/stats/recent-completions"
import { StatTile } from "@/components/stats/stat-tile"
import { WeeklyColumns } from "@/components/stats/weekly-columns"
import { Skeleton } from "@/components/ui/skeleton"
import { useFilters } from "@/hooks/use-filters"
import { useNow } from "@/hooks/use-now"
import {
  byPriority,
  byProject,
  byWorkspace,
  completedTasks,
  heatmapDays,
  summarize,
  weeklyCounts,
} from "@/lib/tasks/completion-stats"
import { applyFilters } from "@/lib/tasks/filters"
import { computeStreak, streakDayKeys } from "@/lib/tasks/streak"

const HEATMAP_WEEKS = 26
const WEEKLY_WEEKS = 12

export function StatsView() {
  const now = useNow()
  if (!now) return <StatsSkeleton />
  return <Stats now={now} />
}

function Stats({ now }: { now: Date }) {
  const { tasks, workspaces, projects } = useAppData()
  const { filters } = useFilters()

  // Deadline filters describe open work, so stats ignore them.
  const scoped = useMemo(() => applyFilters(tasks, { ...filters, due: null }, now), [tasks, filters, now])
  const completed = useMemo(() => completedTasks(scoped), [scoped])
  const streak = useMemo(() => computeStreak(completed, now), [completed, now])
  const summary = useMemo(() => summarize(completed, now), [completed, now])
  const days = useMemo(() => heatmapDays(completed, HEATMAP_WEEKS, now), [completed, now])
  const weeks = useMemo(() => weeklyCounts(completed, WEEKLY_WEEKS, now), [completed, now])
  const streakKeys = useMemo(() => streakDayKeys(streak), [streak])

  const weekDelta = summary.thisWeek - summary.lastWeek

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Current streak"
          icon={<FlameIcon className="size-4 text-orange-500" />}
          value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`}
          detail={
            streak.current === 0
              ? "Complete a task to start one"
              : streak.isActiveToday
                ? "Today counted"
                : "Complete a task today to keep it"
          }
        />
        <StatTile
          label="Longest streak"
          icon={<TrophyIcon className="size-4 text-amber-500" />}
          value={`${streak.longest} ${streak.longest === 1 ? "day" : "days"}`}
        />
        <StatTile
          label="Completed this week"
          icon={<CheckCircle2Icon className="size-4 text-emerald-500" />}
          value={String(summary.thisWeek)}
          detail={`${weekDelta >= 0 ? "+" : ""}${weekDelta} vs last week · ${summary.total} all time`}
        />
        <StatTile
          label="On time"
          icon={<TargetIcon className="size-4 text-sky-500" />}
          value={summary.onTimeRate === null ? "—" : `${Math.round(summary.onTimeRate * 100)}%`}
          detail={
            summary.withDeadline
              ? `of ${summary.withDeadline} with a deadline`
              : "No completed tasks had deadlines"
          }
        />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">Activity</h3>
          <p className="text-xs text-muted-foreground">Tasks completed per day, last {HEATMAP_WEEKS} weeks</p>
        </div>
        <ActivityHeatmap days={days} streakKeys={streakKeys} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">Completed per week</h3>
            <p className="text-xs text-muted-foreground">
              {summary.medianHoursToComplete === null
                ? `Last ${WEEKLY_WEEKS} weeks`
                : `Median time to finish: ${formatDuration(summary.medianHoursToComplete)}`}
            </p>
          </div>
          <WeeklyColumns weeks={weeks} />
        </section>
        <BreakdownBars title="By priority" rows={byPriority(completed)} showKeys={false} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownBars title="By workspace" rows={byWorkspace(completed, workspaces)} />
        <BreakdownBars title="By project" rows={byProject(completed, projects)} />
      </div>

      <RecentCompletions completed={completed} />
    </div>
  )
}

const HOURS_PER_DAY = 24

function formatDuration(hours: number): string {
  if (hours < 1) return "under an hour"
  if (hours < HOURS_PER_DAY) return `${Math.round(hours)}h`
  const days = hours / HOURS_PER_DAY
  return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`
}

function StatsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}
