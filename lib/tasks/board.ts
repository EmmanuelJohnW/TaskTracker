import { subDays, isBefore } from "date-fns"

import { STATUSES, type Status, type TaskWithRelations } from "@/lib/tasks/types"

export const DONE_RECENT_DAYS = 7

export type BoardColumns = Record<Status, TaskWithRelations[]>

export function byPosition(a: TaskWithRelations, b: TaskWithRelations): number {
  return a.position - b.position || a.created_at?.localeCompare(b.created_at ?? "") || 0
}

export function groupByStatus(tasks: readonly TaskWithRelations[]): BoardColumns {
  return Object.fromEntries(
    STATUSES.map((status) => [
      status,
      tasks.filter((task) => task.status === status).sort(byPosition),
    ])
  ) as BoardColumns
}

/** Done tasks completed more than DONE_RECENT_DAYS ago are tucked behind a toggle. */
export function isOlderDone(task: TaskWithRelations, now: Date): boolean {
  if (task.status !== "done" || !task.completed_at) return false
  return isBefore(new Date(task.completed_at), subDays(now, DONE_RECENT_DAYS))
}

export function subtaskProgress(task: Pick<TaskWithRelations, "subtasks">): {
  done: number
  total: number
} {
  return {
    done: task.subtasks.filter((subtask) => subtask.done).length,
    total: task.subtasks.length,
  }
}
