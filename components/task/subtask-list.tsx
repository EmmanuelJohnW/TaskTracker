"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { SubtaskProgress } from "@/components/task/task-meta"
import { Checkbox } from "@/components/ui/checkbox"
import { addSubtask, deleteSubtask, updateSubtask } from "@/lib/actions/subtasks"
import { MAX_TITLE } from "@/lib/actions/schemas"
import type { Subtask, TaskWithRelations } from "@/lib/tasks/types"

export function SubtaskList({ task }: { task: TaskWithRelations }) {
  const { mutate } = useAppData()
  const [title, setTitle] = useState("")
  const done = task.subtasks.filter((subtask) => subtask.done).length

  const add = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      user_id: task.user_id,
      task_id: task.id,
      title: trimmed,
      done: false,
      position: task.subtasks.length,
    }
    setTitle("")
    void mutate(() => addSubtask({ id: subtask.id, taskId: task.id, title: trimmed }), {
      optimistic: { type: "subtask-add", taskId: task.id, subtask },
      success: "Subtask added",
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">Subtasks</span>
        <div className="w-32">
          <SubtaskProgress done={done} total={task.subtasks.length} />
        </div>
      </div>
      <ul className="space-y-0.5">
        {task.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>
      <form
        className="flex items-center gap-2 rounded-md px-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <PlusIcon className="size-4 text-muted-foreground" aria-hidden />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE}
          placeholder="Add a subtask"
          aria-label="New subtask"
          className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  )
}

function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const { mutate } = useAppData()
  const [draft, setDraft] = useState(subtask.title)

  const saveTitle = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(subtask.title)
      return
    }
    if (trimmed === subtask.title) return
    void mutate(() => updateSubtask({ id: subtask.id, patch: { title: trimmed } }), {
      optimistic: { type: "subtask-update", taskId: subtask.task_id, subtaskId: subtask.id, patch: { title: trimmed } },
      success: "Subtask renamed",
    })
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-1.5 hover:bg-muted/60">
      <Checkbox
        checked={Boolean(subtask.done)}
        aria-label={`Mark "${subtask.title}" ${subtask.done ? "not done" : "done"}`}
        onCheckedChange={(checked) =>
          void mutate(() => updateSubtask({ id: subtask.id, patch: { done: checked } }), {
            optimistic: { type: "subtask-update", taskId: subtask.task_id, subtaskId: subtask.id, patch: { done: checked } },
            success: checked ? "Subtask done" : "Subtask reopened",
          })
        }
      />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={saveTitle}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        maxLength={MAX_TITLE}
        aria-label="Subtask title"
        className={`h-7 flex-1 bg-transparent text-sm outline-none ${subtask.done ? "text-muted-foreground line-through" : ""}`}
      />
      <button
        type="button"
        aria-label={`Delete subtask "${subtask.title}"`}
        className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
        onClick={() =>
          void mutate(() => deleteSubtask({ id: subtask.id }), {
            optimistic: { type: "subtask-delete", taskId: subtask.task_id, subtaskId: subtask.id },
            success: "Subtask deleted",
          })
        }
      >
        <XIcon className="size-3.5" />
      </button>
    </li>
  )
}
