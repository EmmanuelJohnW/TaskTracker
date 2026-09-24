import type { UpdateTaskInput } from "@/lib/actions/schemas"
import { fromDueInputs, toDueInputs } from "@/lib/tasks/due-input"
import type { Priority, Project, Status, TaskWithRelations } from "@/lib/tasks/types"

export interface TaskDraft {
  title: string
  description: string
  workspaceId: string
  projectId: string // "" means no project
  status: Status
  priority: Priority
  dueDate: string
  dueTime: string
}

export function draftFromTask(task: TaskWithRelations): TaskDraft {
  const due = toDueInputs(task.due_at)
  return {
    title: task.title,
    description: task.description ?? "",
    workspaceId: task.workspace_id,
    projectId: task.project_id ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: due.date,
    dueTime: due.time,
  }
}

/** Keeps the project consistent when the workspace changes. */
export function withWorkspace(draft: TaskDraft, workspaceId: string, projects: readonly Project[]): TaskDraft {
  const projectStillValid = projects.some(
    (project) => project.id === draft.projectId && project.workspace_id === workspaceId
  )
  return { ...draft, workspaceId, projectId: projectStillValid ? draft.projectId : "" }
}

export function draftDueAt(draft: TaskDraft): string | null {
  return fromDueInputs({ date: draft.dueDate, time: draft.dueTime })
}

/** Only the fields that differ from the saved task; empty when nothing changed. */
export function draftPatch(draft: TaskDraft, task: TaskWithRelations): UpdateTaskInput["patch"] {
  const description = draft.description.trim() ? draft.description : null
  const dueAt = draftDueAt(draft)
  const projectId = draft.projectId || null
  const sameInstant = (a: string | null, b: string | null) =>
    a === b || (a !== null && b !== null && new Date(a).getTime() === new Date(b).getTime())

  return {
    ...(draft.title.trim() !== task.title && { title: draft.title.trim() }),
    ...(description !== (task.description ?? null) && { description }),
    ...(draft.workspaceId !== task.workspace_id && { workspaceId: draft.workspaceId }),
    ...(projectId !== task.project_id && { projectId }),
    ...(draft.status !== task.status && { status: draft.status }),
    ...(draft.priority !== task.priority && { priority: draft.priority }),
    ...(!sameInstant(dueAt, task.due_at) && { dueAt }),
  }
}

/** Mirrors an update patch onto task fields for the optimistic UI. */
export function patchToTaskFields(
  patch: UpdateTaskInput["patch"],
  task: TaskWithRelations,
  now: Date
): Partial<TaskWithRelations> {
  const statusChanged = patch.status !== undefined && patch.status !== task.status
  return {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.priority !== undefined && { priority: patch.priority }),
    ...(patch.dueAt !== undefined && { due_at: patch.dueAt }),
    ...(patch.projectId !== undefined && { project_id: patch.projectId }),
    ...(patch.workspaceId !== undefined && { workspace_id: patch.workspaceId }),
    ...(statusChanged && { completed_at: patch.status === "done" ? now.toISOString() : null }),
  }
}
