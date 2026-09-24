"use client"

import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState, type RefObject } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { DescriptionField } from "@/components/task/description-field"
import { SubtaskList } from "@/components/task/subtask-list"
import { TagPicker } from "@/components/task/tag-picker"
import type { NewTaskDefaults } from "@/components/task/task-editor-provider"
import { TaskFields } from "@/components/task/task-fields"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MAX_TITLE } from "@/lib/actions/schemas"
import { createTask, deleteTask, updateTask } from "@/lib/actions/tasks"
import { toDueInputs } from "@/lib/tasks/due-input"
import { draftDueAt, draftFromTask, draftPatch, patchToTaskFields, type TaskDraft } from "@/lib/tasks/draft"
import { POSITION_STEP } from "@/lib/tasks/position"
import type { TaskWithRelations } from "@/lib/tasks/types"

function TitleInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, " "))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          onSubmit()
        }
      }}
      rows={1}
      maxLength={MAX_TITLE}
      placeholder="Task title"
      aria-label="Title"
      autoFocus={!value}
      className="field-sizing-content w-full resize-none bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
    />
  )
}

/** Cmd/Ctrl+Enter saves from anywhere in the form. */
function onSaveShortcut(save: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      save()
    }
  }
}

interface EditTaskFormProps {
  task: TaskWithRelations
  flushRef: RefObject<(() => void) | null>
  onDeleted: () => void
}

export function EditTaskForm({ task, flushRef, onDeleted }: EditTaskFormProps) {
  const { mutate } = useAppData()
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(task))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const patch = draftPatch(draft, task)
  const isDirty = Object.keys(patch).length > 0
  const isValid = draft.title.trim().length > 0

  const save = () => {
    if (!isDirty || !isValid) return
    void mutate(() => updateTask({ id: task.id, patch }), {
      optimistic: { type: "update", id: task.id, patch: patchToTaskFields(patch, task, new Date()) },
      success: "Task saved",
    })
  }

  // Closing the sheet saves pending edits instead of discarding them.
  useEffect(() => {
    flushRef.current = save
    return () => {
      flushRef.current = null
    }
  })

  const remove = () => {
    onDeleted()
    void mutate(() => deleteTask({ id: task.id }), {
      optimistic: { type: "delete", id: task.id },
      success: "Task deleted",
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4" onKeyDown={onSaveShortcut(save)}>
      <TitleInput value={draft.title} onChange={(title) => setDraft({ ...draft, title })} onSubmit={save} />
      <TaskFields draft={draft} onChange={setDraft} />
      <DescriptionField value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
      <Separator />
      <SubtaskList task={task} />
      <TagPicker task={task} />
      <div className="mt-auto flex items-center gap-2 border-t pt-3">
        {confirmingDelete ? (
          <>
            <Button variant="destructive" size="sm" onClick={remove}>
              Confirm delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2Icon /> Delete
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <Button size="sm" onClick={save} disabled={!isDirty || !isValid}>
          Save
        </Button>
      </div>
    </div>
  )
}

interface NewTaskFormProps {
  defaults: NewTaskDefaults
  onCreated: (taskId: string) => void
  onCancel: () => void
}

export function NewTaskForm({ defaults, onCreated, onCancel }: NewTaskFormProps) {
  const { workspaces, projects, tasks, mutate } = useAppData()
  const [pending, setPending] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(() => {
    const workspaceId = defaults.workspaceId ?? workspaces[0]?.id ?? ""
    const projectValid = projects.some((p) => p.id === defaults.projectId && p.workspace_id === workspaceId)
    const due = toDueInputs(defaults.dueAt ?? null)
    return {
      title: "",
      description: "",
      workspaceId,
      projectId: projectValid ? defaults.projectId ?? "" : "",
      status: defaults.status ?? "todo",
      priority: "medium",
      dueDate: due.date,
      dueTime: due.time,
    }
  })
  const isValid = draft.title.trim().length > 0 && Boolean(draft.workspaceId)

  const create = async () => {
    if (!isValid || pending) return
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const columnTop = Math.min(...tasks.filter((t) => t.status === draft.status).map((t) => t.position))
    const input = {
      id,
      title: draft.title.trim(),
      description: draft.description.trim() ? draft.description : null,
      status: draft.status,
      priority: draft.priority,
      workspaceId: draft.workspaceId,
      projectId: draft.projectId || null,
      dueAt: draftDueAt(draft),
    }
    setPending(true)
    const result = await mutate(() => createTask(input), {
      optimistic: {
        type: "create",
        task: {
          id,
          user_id: "",
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          workspace_id: input.workspaceId,
          project_id: input.projectId,
          due_at: input.dueAt,
          position: Number.isFinite(columnTop) ? columnTop - POSITION_STEP : POSITION_STEP,
          completed_at: input.status === "done" ? now : null,
          source: "manual",
          external_id: null,
          created_at: now,
          updated_at: now,
          subtasks: [],
          tags: [],
        },
      },
      success: "Task created",
    })
    setPending(false)
    if (result.success) onCreated(id)
  }

  if (workspaces.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Create a workspace in the sidebar first.</p>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4" onKeyDown={onSaveShortcut(create)}>
      <TitleInput value={draft.title} onChange={(title) => setDraft({ ...draft, title })} onSubmit={create} />
      <TaskFields draft={draft} onChange={setDraft} />
      <DescriptionField value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
      <p className="text-xs text-muted-foreground">You can add subtasks and tags once the task is created.</p>
      <div className="mt-auto flex items-center justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={create} disabled={!isValid || pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Create task
        </Button>
      </div>
    </div>
  )
}
