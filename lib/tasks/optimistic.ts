import type { Subtask, Tag, TaskWithRelations } from "@/lib/tasks/types"

export type OptimisticAction =
  | { type: "create"; task: TaskWithRelations }
  | { type: "update"; id: string; patch: Partial<TaskWithRelations> }
  | { type: "delete"; id: string }
  | { type: "subtask-add"; taskId: string; subtask: Subtask }
  | { type: "subtask-update"; taskId: string; subtaskId: string; patch: Partial<Subtask> }
  | { type: "subtask-delete"; taskId: string; subtaskId: string }
  | { type: "tag-toggle"; taskId: string; tag: Tag; attached: boolean }

function updateTask(
  tasks: readonly TaskWithRelations[],
  id: string,
  update: (task: TaskWithRelations) => TaskWithRelations
): TaskWithRelations[] {
  return tasks.map((task) => (task.id === id ? update(task) : task))
}

/** Pure reducer applied by useOptimistic while a server action is in flight. */
export function applyOptimistic(
  tasks: TaskWithRelations[],
  action: OptimisticAction
): TaskWithRelations[] {
  switch (action.type) {
    case "create":
      return [...tasks, action.task]
    case "update":
      return updateTask(tasks, action.id, (task) => ({ ...task, ...action.patch }))
    case "delete":
      return tasks.filter((task) => task.id !== action.id)
    case "subtask-add":
      return updateTask(tasks, action.taskId, (task) => ({
        ...task,
        subtasks: [...task.subtasks, action.subtask],
      }))
    case "subtask-update":
      return updateTask(tasks, action.taskId, (task) => ({
        ...task,
        subtasks: task.subtasks.map((subtask) =>
          subtask.id === action.subtaskId ? { ...subtask, ...action.patch } : subtask
        ),
      }))
    case "subtask-delete":
      return updateTask(tasks, action.taskId, (task) => ({
        ...task,
        subtasks: task.subtasks.filter((subtask) => subtask.id !== action.subtaskId),
      }))
    case "tag-toggle":
      return updateTask(tasks, action.taskId, (task) => ({
        ...task,
        tags: action.attached
          ? [...task.tags.filter((tag) => tag.id !== action.tag.id), action.tag]
          : task.tags.filter((tag) => tag.id !== action.tag.id),
      }))
  }
}
