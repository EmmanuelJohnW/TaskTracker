import type { TaskWithRelations, Workspace } from "@/lib/tasks/types"

let counter = 0

export function makeTask(overrides: Partial<TaskWithRelations> = {}): TaskWithRelations {
  counter += 1
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    user_id: "u1",
    workspace_id: "ws-study",
    project_id: null,
    title: `Task ${counter}`,
    description: null,
    status: "todo",
    priority: "medium",
    due_at: null,
    position: counter * 1000,
    completed_at: null,
    source: "manual",
    external_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    subtasks: [],
    tags: [],
    ...overrides,
  }
}

export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "ws-study",
    user_id: "u1",
    name: "Study",
    color: "#6366f1",
    position: 0,
    created_at: null,
    ...overrides,
  }
}
