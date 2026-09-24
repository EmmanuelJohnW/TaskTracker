"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAppData } from "@/components/app/app-data-provider"
import { createTask } from "@/lib/actions/tasks"
import { MAX_TITLE } from "@/lib/actions/schemas"
import { POSITION_STEP } from "@/lib/tasks/position"
import type { Status, TaskWithRelations } from "@/lib/tasks/types"

interface QuickAddProps {
  status: Status
  workspaceId: string | null
  projectId: string | null
  topPosition: number | null
}

export function QuickAdd({ status, workspaceId, projectId, topPosition }: QuickAddProps) {
  const { mutate, workspaces } = useAppData()
  const [title, setTitle] = useState("")

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const targetWorkspace = workspaceId ?? workspaces[0]?.id
    if (!targetWorkspace) {
      toast.error("Create a workspace first.")
      return
    }

    const now = new Date().toISOString()
    const optimisticTask: TaskWithRelations = {
      id: crypto.randomUUID(),
      user_id: "",
      workspace_id: targetWorkspace,
      project_id: projectId,
      title: trimmed,
      description: null,
      status,
      priority: "medium",
      due_at: null,
      position: topPosition === null ? POSITION_STEP : topPosition - POSITION_STEP,
      completed_at: status === "done" ? now : null,
      source: "manual",
      external_id: null,
      created_at: now,
      updated_at: now,
      subtasks: [],
      tags: [],
    }
    setTitle("")
    void mutate(
      () =>
        createTask({
          id: optimisticTask.id,
          title: trimmed,
          status,
          workspaceId: targetWorkspace,
          projectId,
        }),
      { optimistic: { type: "create", task: optimisticTask }, success: "Task added" }
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex items-center gap-1.5 rounded-md border border-dashed border-transparent px-2 py-1 focus-within:border-border hover:border-border"
    >
      <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setTitle("")
            event.currentTarget.blur()
          }
        }}
        maxLength={MAX_TITLE}
        placeholder="Add task"
        aria-label={`Add task to column`}
        className="h-6 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}
