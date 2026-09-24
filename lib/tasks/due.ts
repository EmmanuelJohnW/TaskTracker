import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfWeek,
} from "date-fns"

import type { TaskWithRelations } from "@/lib/tasks/types"

export const WEEK_STARTS_ON = 1 // Monday
export const DUE_SOON_DAYS = 3

export type DueTone = "overdue" | "today" | "soon" | "neutral"

/**
 * Date-only deadlines are stored at 23:59 local time; anything else carries an
 * explicit time that the UI shows.
 */
export const DATE_ONLY_HOURS = 23
export const DATE_ONLY_MINUTES = 59

export function hasExplicitTime(dueAt: Date): boolean {
  return !(dueAt.getHours() === DATE_ONLY_HOURS && dueAt.getMinutes() === DATE_ONLY_MINUTES)
}

export function isOverdue(task: Pick<TaskWithRelations, "due_at" | "status">, now: Date): boolean {
  if (!task.due_at || task.status === "done") return false
  return isBefore(new Date(task.due_at), now)
}

export function dueTone(task: Pick<TaskWithRelations, "due_at" | "status">, now: Date): DueTone {
  if (!task.due_at || task.status === "done") return "neutral"
  const due = new Date(task.due_at)
  if (isOverdue(task, now)) return "overdue"
  if (isSameDay(due, now)) return "today"
  if (differenceInCalendarDays(due, now) <= DUE_SOON_DAYS) return "soon"
  return "neutral"
}

export function weekInterval(now: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
  }
}

export function isInThisWeek(date: Date, now: Date): boolean {
  return isWithinInterval(date, weekInterval(now))
}

export const DUE_GROUPS = ["overdue", "today", "tomorrow", "this_week", "later", "no_date"] as const
export type DueGroup = (typeof DUE_GROUPS)[number]

export const DUE_GROUP_LABELS: Record<DueGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
  no_date: "No Date",
}

/** Groups for the list view, which only lists open tasks. */
export function dueGroup(task: Pick<TaskWithRelations, "due_at">, now: Date): DueGroup {
  if (!task.due_at) return "no_date"
  const due = new Date(task.due_at)
  if (isBefore(due, now)) return "overdue"
  if (isSameDay(due, now)) return "today"
  if (isSameDay(due, addDays(now, 1))) return "tomorrow"
  if (isInThisWeek(due, now)) return "this_week"
  return "later"
}
