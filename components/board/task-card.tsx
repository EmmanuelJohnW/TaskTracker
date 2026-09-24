"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"

import {
  DueBadge,
  PriorityIndicator,
  ProjectChip,
  SubtaskProgress,
  TagChips,
} from "@/components/task/task-meta"
import { subtaskProgress } from "@/lib/tasks/board"
import type { Project, TaskWithRelations } from "@/lib/tasks/types"

interface TaskCardProps {
  task: TaskWithRelations
  project?: Project
  now: Date
  isOverlay?: boolean
}

export function TaskCardBody({ task, project, now, isOverlay }: TaskCardProps) {
  const progress = subtaskProgress(task)
  return (
    <div
      className={cn(
        "group space-y-2 rounded-lg border bg-card p-2.5 text-left shadow-xs transition-colors hover:border-foreground/20",
        task.status === "done" && "opacity-70",
        isOverlay && "rotate-1 shadow-lg ring-1 ring-primary/40"
      )}
    >
      <div className="flex items-start gap-2">
        <p className={cn("flex-1 text-[13px] leading-snug font-medium", task.status === "done" && "line-through decoration-muted-foreground/60")}>
          {task.title}
        </p>
        <PriorityIndicator priority={task.priority} />
      </div>
      {(project || task.due_at) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {project && <ProjectChip project={project} />}
          <DueBadge task={task} now={now} />
        </div>
      )}
      <SubtaskProgress {...progress} />
      <TagChips tags={task.tags} />
    </div>
  )
}

interface SortableTaskCardProps extends TaskCardProps {
  onOpen: (taskId: string) => void
}

export function SortableTaskCard({ task, project, now, onOpen }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-manipulation outline-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
      aria-label={task.title}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        // Space starts a keyboard drag (dnd-kit); Enter opens the editor.
        if (event.key === "Enter") onOpen(task.id)
        else listeners?.onKeyDown?.(event)
      }}
    >
      <TaskCardBody task={task} project={project} now={now} />
    </div>
  )
}
