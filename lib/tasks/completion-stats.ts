import { addDays, addWeeks, format, isAfter, isBefore, startOfDay, startOfWeek } from "date-fns"

import { WEEK_STARTS_ON } from "@/lib/tasks/due"
import { completionsByDay } from "@/lib/tasks/streak"
import { PRIORITIES, type Priority, type Project, type TaskWithRelations, type Workspace } from "@/lib/tasks/types"

export interface HeatmapDay {
  date: Date
  key: string
  count: number
  isFuture: boolean
}

export interface WeekBucket {
  start: Date
  count: number
}

export interface Breakdown {
  id: string
  label: string
  color: string | null
  count: number
}

export interface CompletionStats {
  total: number
  thisWeek: number
  lastWeek: number
  /** Share of completed tasks that had a deadline and met it; null with none. */
  onTimeRate: number | null
  withDeadline: number
  /** Median hours from creation to completion; null with no data. */
  medianHoursToComplete: number | null
}

export const MAX_BREAKDOWN_ROWS = 6

export function completedTasks(tasks: readonly TaskWithRelations[]): TaskWithRelations[] {
  return tasks
    .filter((task) => task.status === "done" && task.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const HOUR_MS = 3_600_000

export function summarize(completed: readonly TaskWithRelations[], now: Date): CompletionStats {
  const weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
  const lastWeekStart = addWeeks(weekStart, -1)
  const at = (task: TaskWithRelations) => new Date(task.completed_at as string)

  const withDeadline = completed.filter((task) => task.due_at)
  const onTime = withDeadline.filter((task) => !isAfter(at(task), new Date(task.due_at as string)))
  const durations = completed
    .filter((task) => task.created_at)
    .map((task) => (at(task).getTime() - new Date(task.created_at as string).getTime()) / HOUR_MS)
    .filter((hours) => hours >= 0)

  return {
    total: completed.length,
    thisWeek: completed.filter((task) => !isBefore(at(task), weekStart)).length,
    lastWeek: completed.filter((task) => !isBefore(at(task), lastWeekStart) && isBefore(at(task), weekStart)).length,
    onTimeRate: withDeadline.length ? onTime.length / withDeadline.length : null,
    withDeadline: withDeadline.length,
    medianHoursToComplete: median(durations),
  }
}

/** Whole weeks (Monday-start) ending with the current one, oldest first. */
export function heatmapDays(completed: readonly TaskWithRelations[], weeks: number, now: Date): HeatmapDay[] {
  const counts = completionsByDay(completed)
  const today = startOfDay(now)
  const start = addWeeks(startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }), -(weeks - 1))
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = format(date, "yyyy-MM-dd")
    return { date, key, count: counts.get(key) ?? 0, isFuture: isAfter(date, today) }
  })
}

export function weeklyCounts(completed: readonly TaskWithRelations[], weeks: number, now: Date): WeekBucket[] {
  const current = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
  return Array.from({ length: weeks }, (_, i) => {
    const start = addWeeks(current, i - (weeks - 1))
    const end = addWeeks(start, 1)
    const count = completed.filter((task) => {
      const at = new Date(task.completed_at as string)
      return !isBefore(at, start) && isBefore(at, end)
    }).length
    return { start, count }
  })
}

/** Groups counts, keeps the largest rows and folds the tail into "Other". */
function topWithOther(rows: Breakdown[], limit = MAX_BREAKDOWN_ROWS): Breakdown[] {
  const sorted = rows.filter((row) => row.count > 0).sort((a, b) => b.count - a.count)
  if (sorted.length <= limit) return sorted
  const tail = sorted.slice(limit - 1)
  return [
    ...sorted.slice(0, limit - 1),
    { id: "other", label: `Other (${tail.length})`, color: null, count: tail.reduce((sum, row) => sum + row.count, 0) },
  ]
}

export function byWorkspace(completed: readonly TaskWithRelations[], workspaces: readonly Workspace[]): Breakdown[] {
  return topWithOther(
    workspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.name,
      color: workspace.color,
      count: completed.filter((task) => task.workspace_id === workspace.id).length,
    }))
  )
}

export function byProject(completed: readonly TaskWithRelations[], projects: readonly Project[]): Breakdown[] {
  const noProject = completed.filter((task) => !task.project_id).length
  return topWithOther([
    ...projects.map((project) => ({
      id: project.id,
      label: project.name,
      color: project.color,
      count: completed.filter((task) => task.project_id === project.id).length,
    })),
    { id: "none", label: "No project", color: null, count: noProject },
  ])
}

export function byPriority(completed: readonly TaskWithRelations[]): Breakdown[] {
  return [...PRIORITIES].reverse().map((priority: Priority) => ({
    id: priority,
    label: priority[0].toUpperCase() + priority.slice(1),
    color: null,
    count: completed.filter((task) => task.priority === priority).length,
  }))
}

/** Quantised heatmap level 0-4 relative to the busiest day in view. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4
}

const MIN_WEEKS_BETWEEN_MONTH_LABELS = 3

/**
 * Month label per heatmap week column (or "" for none): a column is labelled
 * when a month starts inside it, skipping labels that would crowd the last one.
 */
export function monthLabels(days: readonly HeatmapDay[]): string[] {
  const labels: string[] = []
  let lastLabelled = -MIN_WEEKS_BETWEEN_MONTH_LABELS
  for (let week = 0; week * 7 < days.length; week += 1) {
    const monthStart = days.slice(week * 7, week * 7 + 7).find((day) => day.date.getDate() === 1)
    const fits = week - lastLabelled >= MIN_WEEKS_BETWEEN_MONTH_LABELS
    labels.push(monthStart && fits ? format(monthStart.date, "MMM") : "")
    if (monthStart && fits) lastLabelled = week
  }
  return labels
}
