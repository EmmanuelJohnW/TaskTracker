import { isSameDay } from "date-fns"
import { z } from "zod"

import { isInThisWeek, isOverdue } from "@/lib/tasks/due"
import { PRIORITIES, type Priority, type TaskWithRelations } from "@/lib/tasks/types"

export const DUE_FILTERS = ["overdue", "today", "week", "none"] as const
export type DueFilter = (typeof DUE_FILTERS)[number]

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  none: "No date",
}

export interface TaskFilters {
  workspaceId: string | null
  projectId: string | null
  priorities: Priority[]
  tagIds: string[]
  due: DueFilter | null
  query: string
}

export const EMPTY_FILTERS: TaskFilters = {
  workspaceId: null,
  projectId: null,
  priorities: [],
  tagIds: [],
  due: null,
  query: "",
}

/** URL search-param keys; kept short so shared links stay readable. */
export const FILTER_PARAMS = {
  workspaceId: "ws",
  projectId: "project",
  priorities: "priority",
  tagIds: "tags",
  due: "due",
  query: "q",
} as const

const MAX_QUERY_LENGTH = 200

const uuid = z.uuid()
const csv = (value: string | null) =>
  (value ?? "").split(",").map((part) => part.trim()).filter(Boolean)

type ParamSource = Pick<URLSearchParams, "get">

/** Parses filters from URL params, silently dropping anything malformed. */
export function parseFilters(params: ParamSource): TaskFilters {
  const workspaceId = params.get(FILTER_PARAMS.workspaceId)
  const projectId = params.get(FILTER_PARAMS.projectId)
  const due = params.get(FILTER_PARAMS.due)

  return {
    workspaceId: uuid.safeParse(workspaceId).success ? workspaceId : null,
    projectId: uuid.safeParse(projectId).success ? projectId : null,
    priorities: csv(params.get(FILTER_PARAMS.priorities)).filter((p): p is Priority =>
      (PRIORITIES as readonly string[]).includes(p)
    ),
    tagIds: csv(params.get(FILTER_PARAMS.tagIds)).filter((id) => uuid.safeParse(id).success),
    due: (DUE_FILTERS as readonly string[]).includes(due ?? "") ? (due as DueFilter) : null,
    query: (params.get(FILTER_PARAMS.query) ?? "").slice(0, MAX_QUERY_LENGTH),
  }
}

/** Returns a new URLSearchParams with the filter fields replaced. */
export function writeFilters(
  current: ParamSource & { toString(): string },
  patch: Partial<TaskFilters>
): URLSearchParams {
  const next = new URLSearchParams(current.toString())
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  if ("workspaceId" in patch) set(FILTER_PARAMS.workspaceId, patch.workspaceId ?? null)
  if ("projectId" in patch) set(FILTER_PARAMS.projectId, patch.projectId ?? null)
  if ("priorities" in patch) set(FILTER_PARAMS.priorities, (patch.priorities ?? []).join(","))
  if ("tagIds" in patch) set(FILTER_PARAMS.tagIds, (patch.tagIds ?? []).join(","))
  if ("due" in patch) set(FILTER_PARAMS.due, patch.due ?? null)
  if ("query" in patch) set(FILTER_PARAMS.query, patch.query?.trim() ? patch.query : null)
  return next
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Boolean(
    filters.projectId ||
      filters.priorities.length ||
      filters.tagIds.length ||
      filters.due ||
      filters.query.trim()
  )
}

function matchesDue(task: TaskWithRelations, due: DueFilter, now: Date): boolean {
  if (due === "none") return !task.due_at
  if (!task.due_at) return false
  const date = new Date(task.due_at)
  if (due === "overdue") return isOverdue(task, now)
  if (due === "today") return isSameDay(date, now)
  return isInThisWeek(date, now)
}

function matchesQuery(task: TaskWithRelations, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    task.title.toLowerCase().includes(needle) ||
    (task.description ?? "").toLowerCase().includes(needle)
  )
}

export function applyFilters(
  tasks: readonly TaskWithRelations[],
  filters: TaskFilters,
  now: Date
): TaskWithRelations[] {
  return tasks.filter((task) => {
    if (filters.workspaceId && task.workspace_id !== filters.workspaceId) return false
    if (filters.projectId && task.project_id !== filters.projectId) return false
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false
    if (filters.tagIds.length && !task.tags.some((tag) => filters.tagIds.includes(tag.id))) {
      return false
    }
    if (filters.due && !matchesDue(task, filters.due, now)) return false
    return matchesQuery(task, filters.query)
  })
}
