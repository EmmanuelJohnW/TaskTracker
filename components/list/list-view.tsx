"use client"

import { cn } from "cn"
import { ListTodoIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { EmptyFiltered, EmptyState } from "@/components/app/empty-state"
import { TaskRow } from "@/components/list/task-row"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useFilters } from "@/hooks/use-filters"
import { useNow } from "@/hooks/use-now"
import { DUE_GROUP_LABELS, type DueGroup } from "@/lib/tasks/due"
import { EMPTY_FILTERS, applyFilters, hasActiveFilters } from "@/lib/tasks/filters"
import { completedForList, groupForList, parseListSort, type ListSort } from "@/lib/tasks/list"

const SORT_PARAM = "sort"

const GROUP_ACCENTS: Record<DueGroup, string> = {
  overdue: "text-red-500",
  today: "text-amber-500",
  tomorrow: "text-yellow-500",
  this_week: "text-foreground",
  later: "text-muted-foreground",
  no_date: "text-muted-foreground",
}

export function ListView() {
  const now = useNow()
  if (!now) return <ListSkeleton />
  return <TaskList now={now} />
}

function TaskList({ now }: { now: Date }) {
  const { tasks, projects } = useAppData()
  const { filters, setFilters, setParam, searchParams } = useFilters()
  const { openNew } = useTaskEditor()
  const [showCompleted, setShowCompleted] = useState(false)
  const sort = parseListSort(searchParams.get(SORT_PARAM))

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const visible = useMemo(() => applyFilters(tasks, filters, now), [tasks, filters, now])
  const groups = useMemo(() => groupForList(visible, sort, now), [visible, sort, now])
  const completed = useMemo(() => completedForList(visible), [visible])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sort by
          <NativeSelect
            value={sort}
            onChange={(event) => setParam(SORT_PARAM, event.target.value === "due" ? null : (event.target.value as ListSort))}
            className="w-32"
          >
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
          </NativeSelect>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
            className="accent-primary"
          />
          Show completed ({completed.length})
        </label>
      </div>

      {groups.length === 0 && !showCompleted &&
        (hasActiveFilters(filters) ? (
          <EmptyFiltered onClear={() => setFilters({ ...EMPTY_FILTERS, workspaceId: filters.workspaceId })} />
        ) : (
          <EmptyState
            icon={<ListTodoIcon className="size-5" />}
            title="Nothing open. Nice."
            description="Press N to add a task."
            action={
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => openNew({ workspaceId: filters.workspaceId })}>
                New task
              </button>
            }
          />
        ))}

      {groups.map(({ group, tasks: grouped }) => (
        <ListSection key={group} title={DUE_GROUP_LABELS[group]} count={grouped.length} accent={GROUP_ACCENTS[group]}>
          {grouped.map((task) => (
            <TaskRow key={task.id} task={task} project={task.project_id ? projectsById.get(task.project_id) : undefined} now={now} />
          ))}
        </ListSection>
      ))}

      {showCompleted && completed.length > 0 && (
        <ListSection title="Completed" count={completed.length} accent="text-emerald-500">
          {completed.map((task) => (
            <TaskRow key={task.id} task={task} project={task.project_id ? projectsById.get(task.project_id) : undefined} now={now} />
          ))}
        </ListSection>
      )}
    </div>
  )
}

function ListSection({
  title,
  count,
  accent,
  children,
}: {
  title: string
  count: number
  accent: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title}>
      <h2 className={cn("mb-1 flex items-center gap-2 px-1 text-xs font-semibold tracking-wide uppercase", accent)}>
        {title}
        <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
      </h2>
      <ul className="divide-y rounded-xl border bg-card">{children}</ul>
    </section>
  )
}

function ListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-3" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
