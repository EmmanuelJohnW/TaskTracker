import { isOverdue, isInThisWeek } from "@/lib/tasks/due"
import type { TaskWithRelations, Workspace } from "@/lib/tasks/types"

export interface WorkspaceSplit {
  workspace: Workspace
  openCount: number
}

export interface DashboardStats {
  overdue: number
  dueThisWeek: number
  doneThisWeek: number
  split: WorkspaceSplit[]
  openTotal: number
}

export function computeStats(
  tasks: readonly TaskWithRelations[],
  workspaces: readonly Workspace[],
  now: Date
): DashboardStats {
  const open = tasks.filter((task) => task.status !== "done")
  const split = workspaces.map((workspace) => ({
    workspace,
    openCount: open.filter((task) => task.workspace_id === workspace.id).length,
  }))

  return {
    overdue: open.filter((task) => isOverdue(task, now)).length,
    dueThisWeek: open.filter(
      (task) => task.due_at && isInThisWeek(new Date(task.due_at), now)
    ).length,
    doneThisWeek: tasks.filter(
      (task) =>
        task.status === "done" &&
        task.completed_at &&
        isInThisWeek(new Date(task.completed_at), now)
    ).length,
    split,
    openTotal: open.length,
  }
}
