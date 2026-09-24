import { format, isValid, parse } from "date-fns"

import { DATE_ONLY_HOURS, DATE_ONLY_MINUTES, hasExplicitTime } from "@/lib/tasks/due"

export interface DueInputs {
  date: string // yyyy-MM-dd, or "" for no deadline
  time: string // HH:mm, or "" for a date-only deadline
}

/** Splits a stored deadline into local date/time input values. */
export function toDueInputs(dueAt: string | null): DueInputs {
  if (!dueAt) return { date: "", time: "" }
  const due = new Date(dueAt)
  return {
    date: format(due, "yyyy-MM-dd"),
    time: hasExplicitTime(due) ? format(due, "HH:mm") : "",
  }
}

/** Joins local date/time inputs into an ISO timestamp (date-only → 23:59 local). */
export function fromDueInputs({ date, time }: DueInputs): string | null {
  if (!date) return null
  const day = parse(date, "yyyy-MM-dd", new Date())
  if (!isValid(day)) return null

  const [hours, minutes] = time
    ? time.split(":").map(Number)
    : [DATE_ONLY_HOURS, DATE_ONLY_MINUTES]
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null

  const due = new Date(day)
  due.setHours(hours, minutes, 0, 0)
  return due.toISOString()
}
