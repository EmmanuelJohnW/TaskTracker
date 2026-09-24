"use client"

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useCallback, useRef, useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { moveTask, rebalanceColumn } from "@/lib/actions/tasks"
import type { BoardColumns } from "@/lib/tasks/board"
import { needsRebalance, positionForDrop } from "@/lib/tasks/position"
import { STATUSES, STATUS_LABELS, isStatus, type Status, type TaskWithRelations } from "@/lib/tasks/types"

const MOUSE_DRAG_DISTANCE = 6
const TOUCH_DRAG_DELAY_MS = 200
const TOUCH_TOLERANCE = 8
/** Clicks fired by the drop itself must not open the editor. */
const CLICK_SUPPRESS_MS = 150

function findContainer(columns: BoardColumns, id: UniqueIdentifier): Status | null {
  const key = String(id)
  if (isStatus(key)) return key
  return STATUSES.find((status) => columns[status].some((task) => task.id === key)) ?? null
}

function withTaskMoved(
  columns: BoardColumns,
  taskId: string,
  from: Status,
  to: Status,
  index: number
): BoardColumns {
  const task = columns[from].find((item) => item.id === taskId)
  if (!task) return columns
  const target = columns[to].filter((item) => item.id !== taskId)
  return {
    ...columns,
    [from]: columns[from].filter((item) => item.id !== taskId),
    [to]: [...target.slice(0, index), { ...task, status: to }, ...target.slice(index)],
  }
}

export function useBoardDnd(displayed: BoardColumns, now: Date | null) {
  const { tasks, mutate } = useAppData()
  const [dragColumns, setDragColumns] = useState<BoardColumns | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const lastDropAt = useRef(0)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_TOLERANCE },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  )

  const columns = dragColumns ?? displayed
  const activeTask = activeId ? tasks.find((task) => task.id === activeId) ?? null : null

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(String(active.id))
      setDragColumns(displayed)
    },
    [displayed]
  )

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return
    setDragColumns((current) => {
      if (!current) return current
      const from = findContainer(current, active.id)
      const to = findContainer(current, over.id)
      if (!from || !to || from === to) return current

      const overItems = current[to]
      const overIndex = overItems.findIndex((task) => task.id === over.id)
      const activeRect = active.rect.current.translated
      const isBelow = activeRect ? activeRect.top > over.rect.top + over.rect.height / 2 : false
      const index = overIndex >= 0 ? overIndex + (isBelow ? 1 : 0) : overItems.length
      return withTaskMoved(current, String(active.id), from, to, index)
    })
  }, [])

  const persistMove = useCallback(
    (task: TaskWithRelations, status: Status, ordered: TaskWithRelations[]) => {
      const index = ordered.findIndex((item) => item.id === task.id)
      const before = ordered[index - 1]?.position ?? null
      const after = ordered[index + 1]?.position ?? null
      // Filters may hide part of the column, so place against all of it.
      const columnPositions = tasks
        .filter((item) => item.status === status && item.id !== task.id)
        .map((item) => item.position)
        .sort((a, b) => a - b)
      const position = positionForDrop(columnPositions, before, after)
      const completedAt =
        status === "done" ? task.completed_at ?? (now ?? new Date()).toISOString() : null
      const statusChanged = status !== task.status

      void mutate(() => moveTask({ id: task.id, status, position }), {
        optimistic: {
          type: "update",
          id: task.id,
          patch: { status, position, completed_at: completedAt },
        },
        success: statusChanged ? `Moved to ${STATUS_LABELS[status]}` : undefined,
      }).then((result) => {
        const positions = [...columnPositions, position].sort((a, b) => a - b)
        if (result.success && needsRebalance(positions)) {
          void mutate(() => rebalanceColumn({ status }))
        }
      })
    },
    [mutate, now, tasks]
  )

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      lastDropAt.current = Date.now()
      const current = dragColumns
      const taskId = String(active.id)
      const original = tasks.find((task) => task.id === taskId)
      setActiveId(null)
      setDragColumns(null)
      if (!current || !over || !original) return

      const status = findContainer(current, taskId)
      if (!status) return
      const items = current[status]
      const fromIndex = items.findIndex((task) => task.id === taskId)
      const overIndex = items.findIndex((task) => task.id === String(over.id))
      const ordered =
        overIndex >= 0 && overIndex !== fromIndex ? arrayMove(items, fromIndex, overIndex) : items

      const originalIndex = displayed[original.status].findIndex((task) => task.id === taskId)
      const finalIndex = ordered.findIndex((task) => task.id === taskId)
      if (status === original.status && finalIndex === originalIndex) return

      persistMove(original, status, ordered)
    },
    [dragColumns, tasks, displayed, persistMove]
  )

  const onDragCancel = useCallback(() => {
    setActiveId(null)
    setDragColumns(null)
  }, [])

  const shouldIgnoreClick = useCallback(
    () => Date.now() - lastDropAt.current < CLICK_SUPPRESS_MS,
    []
  )

  return {
    sensors,
    columns,
    activeTask,
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel },
    shouldIgnoreClick,
  }
}
