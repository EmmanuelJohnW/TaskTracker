import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import { WEEK_STARTS_ON } from "@/lib/tasks/due"
import { compareTasks } from "@/lib/tasks/list"
import type { TaskWithRelations } from "@/lib/tasks/types"

export const MONTH_PARAM = "month"
const MONTH_FORMAT = "yyyy-MM"
export const DAY_KEY_FORMAT = "yyyy-MM-dd"

export function parseMonth(value: string | null, now: Date): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const parsed = parse(value, MONTH_FORMAT, now)
    if (isValid(parsed)) return startOfMonth(parsed)
  }
  return startOfMonth(now)
}

export function formatMonth(month: Date): string {
  return format(month, MONTH_FORMAT)
}

/** Every day shown in a Monday-start month grid, including leading/trailing days. */
export function monthGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  })
}

export function dayKey(date: Date): string {
  return format(date, DAY_KEY_FORMAT)
}

/** Tasks keyed by local due day, ordered by time then priority. */
export function tasksByDay(tasks: readonly TaskWithRelations[]): Map<string, TaskWithRelations[]> {
  const byDay = new Map<string, TaskWithRelations[]>()
  for (const task of [...tasks].sort(compareTasks("due"))) {
    if (!task.due_at) continue
    const key = dayKey(new Date(task.due_at))
    byDay.set(key, [...(byDay.get(key) ?? []), task])
  }
  return byDay
}
