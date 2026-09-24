import { format, isSameYear } from "date-fns"
import { CalendarIcon, SignalHighIcon, SignalLowIcon, SignalMediumIcon, SirenIcon } from "lucide-react"
import { cn } from "cn"

import { dueTone, hasExplicitTime, type DueTone } from "@/lib/tasks/due"
import {
  PRIORITY_LABELS,
  type Priority,
  type Project,
  type Tag,
  type TaskWithRelations,
} from "@/lib/tasks/types"

const FALLBACK_COLOR = "#71717a"

export function ColorDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? FALLBACK_COLOR }}
    />
  )
}

export function ProjectChip({ project }: { project: Project }) {
  const color = project.color ?? FALLBACK_COLOR
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <ColorDot color={color} className="size-1.5" />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

const PRIORITY_STYLES: Record<Priority, { icon: typeof SignalLowIcon; className: string }> = {
  low: { icon: SignalLowIcon, className: "text-muted-foreground" },
  medium: { icon: SignalMediumIcon, className: "text-sky-500" },
  high: { icon: SignalHighIcon, className: "text-orange-500" },
  urgent: { icon: SirenIcon, className: "text-red-500" },
}

export function PriorityIndicator({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const { icon: Icon, className } = PRIORITY_STYLES[priority]
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px]", className)}
      title={`${PRIORITY_LABELS[priority]} priority`}
    >
      <Icon className="size-3.5" aria-hidden />
      {showLabel ? PRIORITY_LABELS[priority] : <span className="sr-only">{PRIORITY_LABELS[priority]} priority</span>}
    </span>
  )
}

const DUE_TONE_STYLES: Record<DueTone, string> = {
  overdue: "bg-red-500/15 text-red-600 dark:text-red-400",
  today: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  soon: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-300",
  neutral: "bg-muted text-muted-foreground",
}

export function formatDue(dueAt: string, now: Date): string {
  const due = new Date(dueAt)
  const day = format(due, isSameYear(due, now) ? "MMM d" : "MMM d, yyyy")
  return hasExplicitTime(due) ? `${day}, ${format(due, "HH:mm")}` : day
}

export function DueBadge({ task, now }: { task: Pick<TaskWithRelations, "due_at" | "status">; now: Date }) {
  if (!task.due_at) return null
  const tone = dueTone(task, now)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        DUE_TONE_STYLES[tone]
      )}
    >
      <CalendarIcon className="size-3" aria-hidden />
      {tone === "overdue" && <span className="sr-only">Overdue:</span>}
      {formatDue(task.due_at, now)}
    </span>
  )
}

export function TagChips({ tags, max = 3 }: { tags: Tag[]; max?: number }) {
  if (tags.length === 0) return null
  const visible = tags.slice(0, max)
  const hidden = tags.length - visible.length
  return (
    <span className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full border px-1.5 text-[10px] leading-4 text-muted-foreground"
        >
          <ColorDot color={tag.color} className="size-1.5" />
          {tag.name}
        </span>
      ))}
      {hidden > 0 && <span className="text-[10px] text-muted-foreground">+{hidden}</span>}
    </span>
  )
}

export function SubtaskProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const percent = Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2" title={`${done} of ${total} subtasks done`}>
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Subtask progress"
      >
        <div
          className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  )
}
