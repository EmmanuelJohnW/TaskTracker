"use client"

import { format } from "date-fns"
import { cn } from "cn"

import { useAppData } from "@/components/app/app-data-provider"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { hasExplicitTime, isOverdue } from "@/lib/tasks/due"
import { PRIORITY_LABELS, type TaskWithRelations } from "@/lib/tasks/types"

export function CalendarTask({ task, now }: { task: TaskWithRelations; now: Date }) {
  const { projects, workspaces } = useAppData()
  const { openTask } = useTaskEditor()
  const color =
    projects.find((project) => project.id === task.project_id)?.color ??
    workspaces.find((workspace) => workspace.id === task.workspace_id)?.color ??
    "#71717a"
  const due = task.due_at ? new Date(task.due_at) : null
  const isDone = task.status === "done"

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      title={`${task.title} · ${PRIORITY_LABELS[task.priority]} priority`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-4 hover:brightness-125",
        isDone && "text-muted-foreground line-through opacity-70",
        isOverdue(task, now) && "text-red-600 dark:text-red-400"
      )}
      style={{ borderLeftColor: color, backgroundColor: `${color}1f` }}
    >
      {due && hasExplicitTime(due) && <span className="shrink-0 tabular-nums opacity-70">{format(due, "HH:mm")}</span>}
      <span className="truncate">{task.title}</span>
    </button>
  )
}
