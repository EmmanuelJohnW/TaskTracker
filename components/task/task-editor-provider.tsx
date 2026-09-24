"use client"

import { createContext, use, useCallback, useMemo, useState } from "react"

import type { Status } from "@/lib/tasks/types"

export interface NewTaskDefaults {
  status?: Status
  workspaceId?: string | null
  projectId?: string | null
  dueAt?: string | null
}

export type EditorState =
  | { mode: "closed" }
  | { mode: "edit"; taskId: string }
  | { mode: "new"; defaults: NewTaskDefaults }

interface TaskEditorContextValue {
  state: EditorState
  openTask: (taskId: string) => void
  openNew: (defaults?: NewTaskDefaults) => void
  close: () => void
}

const TaskEditorContext = createContext<TaskEditorContextValue | null>(null)

export function TaskEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EditorState>({ mode: "closed" })

  const openTask = useCallback((taskId: string) => setState({ mode: "edit", taskId }), [])
  const openNew = useCallback(
    (defaults: NewTaskDefaults = {}) => setState({ mode: "new", defaults }),
    []
  )
  const close = useCallback(() => setState({ mode: "closed" }), [])

  const value = useMemo(() => ({ state, openTask, openNew, close }), [state, openTask, openNew, close])
  return <TaskEditorContext value={value}>{children}</TaskEditorContext>
}

export function useTaskEditor(): TaskEditorContextValue {
  const context = use(TaskEditorContext)
  if (!context) throw new Error("useTaskEditor must be used inside TaskEditorProvider")
  return context
}
