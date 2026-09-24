"use client"

import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core"
import { useMemo, useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { EmptyFiltered } from "@/components/app/empty-state"
import { BoardColumn } from "@/components/board/board-column"
import { BoardSkeleton } from "@/components/board/board-skeleton"
import { TaskCardBody } from "@/components/board/task-card"
import { useBoardDnd } from "@/components/board/use-board-dnd"
import { DashboardStrip } from "@/components/dashboard/dashboard-strip"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { useFilters } from "@/hooks/use-filters"
import { useNow } from "@/hooks/use-now"
import { groupByStatus, isOlderDone, type BoardColumns } from "@/lib/tasks/board"
import { applyFilters, hasActiveFilters } from "@/lib/tasks/filters"
import { STATUSES } from "@/lib/tasks/types"

export function BoardView() {
  const now = useNow()
  if (!now) return <BoardSkeleton />
  return <Board now={now} />
}

function Board({ now }: { now: Date }) {
  const { tasks, projects } = useAppData()
  const { filters, setFilters } = useFilters()
  const { openTask } = useTaskEditor()
  const [showOlderDone, setShowOlderDone] = useState(false)

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const visible = useMemo(() => applyFilters(tasks, filters, now), [tasks, filters, now])
  const grouped = useMemo(() => groupByStatus(visible), [visible])
  // Quick add inserts above everything in the column, filtered out or not.
  const columnTops = useMemo(() => {
    const all = groupByStatus(tasks)
    return new Map(STATUSES.map((status) => [status, all[status][0]?.position ?? null]))
  }, [tasks])
  const olderDone = useMemo(() => grouped.done.filter((task) => isOlderDone(task, now)), [grouped, now])

  const displayed: BoardColumns = useMemo(
    () =>
      showOlderDone
        ? grouped
        : { ...grouped, done: grouped.done.filter((task) => !isOlderDone(task, now)) },
    [grouped, showOlderDone, now]
  )

  const { sensors, columns, activeTask, handlers, shouldIgnoreClick } = useBoardDnd(displayed, now)
  const open = (taskId: string) => {
    if (!shouldIgnoreClick()) openTask(taskId)
  }

  const olderToggle =
    olderDone.length > 0 ? (
      <button
        type="button"
        onClick={() => setShowOlderDone((value) => !value)}
        className="mt-1 rounded-md py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {showOlderDone ? "Hide older" : `Show older (${olderDone.length})`}
      </button>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DashboardStrip now={now} />
      {visible.length === 0 && hasActiveFilters(filters) && (
        <EmptyFiltered onClear={() => setFilters({ projectId: null, priorities: [], tagIds: [], due: null, query: "" })} />
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} {...handlers}>
        <div className="board-scroller -mx-4 flex min-h-0 flex-1 scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:scroll-px-0 lg:px-0">
          {STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              tasks={columns[status]}
              totalCount={grouped[status].length}
              columnTop={columnTops.get(status) ?? null}
              projectsById={projectsById}
              now={now}
              workspaceId={filters.workspaceId}
              projectId={filters.projectId}
              onOpen={open}
              footer={status === "done" ? olderToggle : undefined}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <TaskCardBody
              task={activeTask}
              project={activeTask.project_id ? projectsById.get(activeTask.project_id) : undefined}
              now={now}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
