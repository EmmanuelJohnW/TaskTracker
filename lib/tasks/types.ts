import type { Tables } from "@/lib/supabase/database.types"

export const STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
}

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

/** Higher is more important; used for sorting. */
export const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
}

export type Workspace = Tables<"workspaces">
export type Project = Tables<"projects">
export type Tag = Tables<"tags">
export type Subtask = Tables<"subtasks">
export type NotificationSettings = Tables<"notification_settings">

/** A task row joined with the relations every view needs. */
export interface TaskWithRelations extends Omit<Tables<"tasks">, "status" | "priority"> {
  status: Status
  priority: Priority
  subtasks: Subtask[]
  tags: Tag[]
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value)
}

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value)
}
