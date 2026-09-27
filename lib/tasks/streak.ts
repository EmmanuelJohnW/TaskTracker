import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns"

import type { TaskWithRelations } from "@/lib/tasks/types"

const DAY_KEY = "yyyy-MM-dd"

export interface Streak {
  /** Consecutive days with a completion, ending today or yesterday. */
  current: number
  longest: number
  /** True when today already has a completion (the streak is secured). */
  isActiveToday: boolean
  /** Day the current streak started, or null when there is none. */
  startedOn: Date | null
}

type Completable = Pick<TaskWithRelations, "status" | "completed_at">

/** Completed-task counts keyed by local calendar day (yyyy-MM-dd). */
export function completionsByDay(tasks: readonly Completable[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (task.status !== "done" || !task.completed_at) continue
    const key = format(new Date(task.completed_at), DAY_KEY)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * A streak counts consecutive local days with at least one completed task.
 * Today without a completion yet does not break it: yesterday's run stays
 * "current" until the day is over.
 */
export function computeStreak(tasks: readonly Completable[], now: Date): Streak {
  const byDay = completionsByDay(tasks)
  if (byDay.size === 0) return { current: 0, longest: 0, isActiveToday: false, startedOn: null }

  const days = [...byDay.keys()].map((key) => startOfDay(new Date(`${key}T00:00:00`))).sort((a, b) => a.getTime() - b.getTime())

  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    run = differenceInCalendarDays(days[i], days[i - 1]) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const today = startOfDay(now)
  const isActiveToday = byDay.has(format(today, DAY_KEY))
  const anchor = isActiveToday ? today : addDays(today, -1)

  let current = 0
  while (byDay.has(format(addDays(anchor, -current), DAY_KEY))) current += 1

  return {
    current,
    longest,
    isActiveToday,
    startedOn: current > 0 ? addDays(anchor, -(current - 1)) : null,
  }
}

/** Local day keys (yyyy-MM-dd) covered by the current streak. */
export function streakDayKeys(streak: Streak): Set<string> {
  const { startedOn, current } = streak
  if (!startedOn) return new Set()
  return new Set(Array.from({ length: current }, (_, i) => format(addDays(startedOn, i), DAY_KEY)))
}
