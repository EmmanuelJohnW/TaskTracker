import { DUE_GROUPS, dueGroup, type DueGroup } from "@/lib/tasks/due"
import { PRIORITY_RANK, type TaskWithRelations } from "@/lib/tasks/types"

export const LIST_SORTS = ["due", "priority"] as const
export type ListSort = (typeof LIST_SORTS)[number]

export function parseListSort(value: string | null): ListSort {
  return value === "priority" ? "priority" : "due"
}

const dueTime = (task: TaskWithRelations) =>
  task.due_at ? new Date(task.due_at).getTime() : Number.POSITIVE_INFINITY

const byDue = (a: TaskWithRelations, b: TaskWithRelations) => dueTime(a) - dueTime(b)
const byPriority = (a: TaskWithRelations, b: TaskWithRelations) =>
  PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]

export function compareTasks(sort: ListSort) {
  return (a: TaskWithRelations, b: TaskWithRelations) =>
    sort === "due"
      ? byDue(a, b) || byPriority(a, b) || a.title.localeCompare(b.title)
      : byPriority(a, b) || byDue(a, b) || a.title.localeCompare(b.title)
}

export interface ListGroup {
  group: DueGroup
  tasks: TaskWithRelations[]
}

/** Open tasks bucketed Overdue → No Date, each bucket sorted; empty buckets dropped. */
export function groupForList(tasks: readonly TaskWithRelations[], sort: ListSort, now: Date): ListGroup[] {
  const open = tasks.filter((task) => task.status !== "done")
  return DUE_GROUPS.map((group) => ({
    group,
    tasks: open.filter((task) => dueGroup(task, now) === group).sort(compareTasks(sort)),
  })).filter(({ tasks: grouped }) => grouped.length > 0)
}

export function completedForList(tasks: readonly TaskWithRelations[]): TaskWithRelations[] {
  return tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
}
