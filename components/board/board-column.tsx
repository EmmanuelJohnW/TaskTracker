"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "cn"

import { SortableTaskCard } from "@/components/board/task-card"
import { QuickAdd } from "@/components/board/quick-add"
import { STATUS_LABELS, type Project, type Status, type TaskWithRelations } from "@/lib/tasks/types"

const STATUS_ACCENTS: Record<Status, string> = {
  backlog: "bg-zinc-400",
  todo: "bg-sky-500",
  in_progress: "bg-amber-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
}

interface BoardColumnProps {
  status: Status
  tasks: TaskWithRelations[]
  projectsById: Map<string, Project>
  now: Date
  workspaceId: string | null
  projectId: string | null
  onOpen: (taskId: string) => void
  footer?: React.ReactNode
  totalCount: number
  /** Smallest position in the whole column, including filtered-out tasks. */
  columnTop: number | null
}

export function BoardColumn({
  status,
  tasks,
  projectsById,
  now,
  workspaceId,
  projectId,
  onOpen,
  footer,
  totalCount,
  columnTop,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column" } })

  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className="flex w-[85vw] shrink-0 flex-col rounded-xl bg-muted/40 sm:w-72 lg:w-auto lg:min-w-0 lg:flex-1"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className={cn("size-2 rounded-full", STATUS_ACCENTS[status])} aria-hidden />
        <h2 className="text-xs font-semibold tracking-wide uppercase">{STATUS_LABELS[status]}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
      </header>
      <div className="px-1.5">
        <QuickAdd
          status={status}
          workspaceId={workspaceId}
          projectId={projectId}
          topPosition={columnTop}
        />
      </div>
      <SortableContext id={status} items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg p-1.5 transition-colors",
            isOver && "bg-primary/5"
          )}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              project={task.project_id ? projectsById.get(task.project_id) : undefined}
              now={now}
              onOpen={onOpen}
            />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              Drop tasks here
            </p>
          )}
          {footer}
        </div>
      </SortableContext>
    </section>
  )
}
