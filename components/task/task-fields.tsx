"use client"

import { XIcon } from "lucide-react"

import { useAppData } from "@/components/app/app-data-provider"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { withWorkspace, type TaskDraft } from "@/lib/tasks/draft"
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Priority, type Status } from "@/lib/tasks/types"

interface TaskFieldsProps {
  draft: TaskDraft
  onChange: (draft: TaskDraft) => void
}

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:[color-scheme:dark]"

/** Status, priority, workspace, project and deadline controls. */
export function TaskFields({ draft, onChange }: TaskFieldsProps) {
  const { workspaces, projects } = useAppData()
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => onChange({ ...draft, [key]: value })
  const workspaceProjects = projects.filter(
    (project) =>
      project.workspace_id === draft.workspaceId && (!project.archived || project.id === draft.projectId)
  )

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
      <Field label="Status" htmlFor="task-status">
        <NativeSelect id="task-status" value={draft.status} onChange={(e) => set("status", e.target.value as Status)}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Priority" htmlFor="task-priority">
        <NativeSelect
          id="task-priority"
          value={draft.priority}
          onChange={(e) => set("priority", e.target.value as Priority)}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Workspace" htmlFor="task-workspace">
        <NativeSelect
          id="task-workspace"
          value={draft.workspaceId}
          onChange={(e) => onChange(withWorkspace(draft, e.target.value, projects))}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Project" htmlFor="task-project">
        <NativeSelect id="task-project" value={draft.projectId} onChange={(e) => set("projectId", e.target.value)}>
          <option value="">No project</option>
          {workspaceProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.archived ? " (archived)" : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Deadline" htmlFor="task-due-date" className="col-span-2">
        <div className="flex items-center gap-2">
          <input
            id="task-due-date"
            type="date"
            value={draft.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            aria-label="Deadline time (optional)"
            value={draft.dueTime}
            disabled={!draft.dueDate}
            onChange={(e) => set("dueTime", e.target.value)}
            className={`${inputClass} w-32 disabled:opacity-50`}
          />
          {draft.dueDate && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear deadline"
              onClick={() => onChange({ ...draft, dueDate: "", dueTime: "" })}
            >
              <XIcon />
            </Button>
          )}
        </div>
      </Field>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
