"use client"

import { format, isAfter } from "date-fns"

import { useAppData } from "@/components/app/app-data-provider"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { ColorDot } from "@/components/task/task-meta"
import type { TaskWithRelations } from "@/lib/tasks/types"

const RECENT_LIMIT = 15

/** Table view of the latest completions; doubles as the charts' accessible data. */
export function RecentCompletions({ completed }: { completed: TaskWithRelations[] }) {
  const { projects, workspaces } = useAppData()
  const { openTask } = useTaskEditor()
  const rows = completed.slice(0, RECENT_LIMIT)

  return (
    <section className="rounded-xl border bg-card">
      <h3 className="border-b px-4 py-3 text-sm font-medium">
        Recently completed <span className="font-normal text-muted-foreground">· {completed.length} total</span>
      </h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">Completed tasks will appear here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-2 py-2 font-medium">Where</th>
                <th className="px-2 py-2 font-medium">Completed</th>
                <th className="px-4 py-2 text-right font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((task) => {
                const project = projects.find((p) => p.id === task.project_id)
                const workspace = workspaces.find((w) => w.id === task.workspace_id)
                const completedAt = new Date(task.completed_at as string)
                const late = task.due_at ? isAfter(completedAt, new Date(task.due_at)) : null
                return (
                  <tr key={task.id} className="hover:bg-muted/40">
                    <td className="max-w-64 px-4 py-2">
                      <button type="button" onClick={() => openTask(task.id)} className="truncate text-left hover:underline">
                        {task.title}
                      </button>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ColorDot color={project?.color ?? workspace?.color} />
                        {project?.name ?? workspace?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap tabular-nums">{format(completedAt, "MMM d, HH:mm")}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {late === null ? (
                        <span className="text-muted-foreground">None</span>
                      ) : late ? (
                        <span className="text-amber-600 dark:text-amber-400">Late</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">On time</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
