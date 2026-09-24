"use client"

import { addMonths, format, isSameDay, isSameMonth } from "date-fns"
import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { CalendarTask } from "@/components/calendar/calendar-task"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useFilters } from "@/hooks/use-filters"
import { useNow } from "@/hooks/use-now"
import { MONTH_PARAM, dayKey, formatMonth, monthGridDays, parseMonth, tasksByDay } from "@/lib/tasks/calendar"
import { fromDueInputs } from "@/lib/tasks/due-input"
import { applyFilters, writeFilters } from "@/lib/tasks/filters"
import type { TaskWithRelations } from "@/lib/tasks/types"

const MAX_VISIBLE_PER_DAY = 3
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function CalendarView() {
  const now = useNow()
  if (!now) return <Skeleton className="h-[70vh] w-full rounded-xl" aria-label="Loading calendar" />
  return <MonthCalendar now={now} />
}

function MonthCalendar({ now }: { now: Date }) {
  const { tasks } = useAppData()
  const { filters, setParam, searchParams } = useFilters()
  const month = parseMonth(searchParams.get(MONTH_PARAM), now)

  const visible = useMemo(() => applyFilters(tasks, filters, now), [tasks, filters, now])
  const byDay = useMemo(() => tasksByDay(visible), [visible])
  const days = useMemo(() => monthGridDays(month), [month])
  const undatedCount = visible.filter((task) => !task.due_at && task.status !== "done").length
  const undatedHref = `/list?${writeFilters(searchParams, { due: "none" }).toString()}`

  const goTo = (target: Date) =>
    setParam(MONTH_PARAM, isSameMonth(target, now) ? null : formatMonth(target))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-36 text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => goTo(addMonths(month, -1))}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goTo(now)}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => goTo(addMonths(month, 1))}>
            <ChevronRightIcon />
          </Button>
        </div>
        {undatedCount > 0 && (
          <Link href={undatedHref} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            {undatedCount} open {undatedCount === 1 ? "task has" : "tasks have"} no date →
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-7 overflow-hidden rounded-xl border bg-border gap-px" role="grid" aria-label={format(month, "MMMM yyyy")}>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} role="columnheader" className="bg-muted/60 px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase">
              {weekday}
            </div>
          ))}
          {days.map((day) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              tasks={byDay.get(dayKey(day)) ?? []}
              inMonth={isSameMonth(day, month)}
              isToday={isSameDay(day, now)}
              now={now}
              workspaceId={filters.workspaceId}
              projectId={filters.projectId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface DayCellProps {
  day: Date
  tasks: TaskWithRelations[]
  inMonth: boolean
  isToday: boolean
  now: Date
  workspaceId: string | null
  projectId: string | null
}

function DayCell({ day, tasks, inMonth, isToday, now, workspaceId, projectId }: DayCellProps) {
  const { openNew } = useTaskEditor()
  const visible = tasks.slice(0, MAX_VISIBLE_PER_DAY)
  const hidden = tasks.length - visible.length

  return (
    <div
      role="gridcell"
      aria-label={format(day, "EEEE d MMMM")}
      className={cn("group flex min-h-28 flex-col gap-1 bg-background p-1.5", !inMonth && "bg-muted/30")}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
            !inMonth && "text-muted-foreground/60",
            isToday && "bg-primary font-semibold text-primary-foreground"
          )}
        >
          {format(day, "d")}
        </span>
        <button
          type="button"
          aria-label={`Add task on ${format(day, "d MMMM")}`}
          onClick={() =>
            openNew({ workspaceId, projectId, dueAt: fromDueInputs({ date: dayKey(day), time: "" }) })
          }
          className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
      {visible.map((task) => (
        <CalendarTask key={task.id} task={task} now={now} />
      ))}
      {hidden > 0 && (
        <Popover>
          <PopoverTrigger className="rounded px-1 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
            +{hidden} more
          </PopoverTrigger>
          <PopoverContent className="w-64 gap-1 p-2">
            <p className="px-1 text-xs font-medium">{format(day, "EEEE d MMMM")}</p>
            {tasks.map((task) => (
              <CalendarTask key={task.id} task={task} now={now} />
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
