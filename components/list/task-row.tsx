"use client"

import { cn } from "cn"

import { useAppData } from "@/components/app/app-data-provider"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { DueBadge, PriorityIndicator, ProjectChip, SubtaskProgress, TagChips } from "@/components/task/task-meta"
import { Checkbox } from "@/components/ui/checkbox"
import { updateTask } from "@/lib/actions/tasks"
import { subtaskProgress } from "@/lib/tasks/board"
import { STATUS_LABELS, type Project, type TaskWithRelations } from "@/lib/tasks/types"

interface TaskRowProps {
  task: TaskWithRelations
  project?: Project
  now: Date
}

export function TaskRow({ task, project, now }: TaskRowProps) {
  const { mutate } = useAppData()
  const { openTask } = useTaskEditor()
  const isDone = task.status === "done"
  const progress = subtaskProgress(task)

  const toggleDone = (checked: boolean) => {
    const status = checked ? "done" : "todo"
    void mutate(() => updateTask({ id: task.id, patch: { status } }), {
      optimistic: {
        type: "update",
        id: task.id,
        patch: { status, completed_at: checked ? now.toISOString() : null },
      },
      success: checked ? "Marked done" : "Reopened",
    })
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
      <Checkbox checked={isDone} onCheckedChange={toggleDone} aria-label={isDone ? `Reopen "${task.title}"` : `Complete "${task.title}"`} />
      <button
        type="button"
        onClick={() => openTask(task.id)}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
      >
        <span className={cn("min-w-0 flex-1 basis-48 truncate text-sm", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {project && <ProjectChip project={project} />}
          <TagChips tags={task.tags} max={2} />
          {progress.total > 0 && (
            <span className="w-20">
              <SubtaskProgress {...progress} />
            </span>
          )}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">{STATUS_LABELS[task.status]}</span>
          <PriorityIndicator priority={task.priority} />
          <DueBadge task={task} now={now} />
        </span>
      </button>
    </li>
  )
}
