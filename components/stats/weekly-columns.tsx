"use client"

import { format } from "date-fns"

import { useChartTooltip } from "@/components/stats/chart-tooltip"
import type { WeekBucket } from "@/lib/tasks/completion-stats"

const CHART_HEIGHT_PX = 120

/** Single-series column chart of completions per week; latest and peak are labelled. */
export function WeeklyColumns({ weeks }: { weeks: WeekBucket[] }) {
  const { containerRef, bind, element } = useChartTooltip()
  const max = Math.max(1, ...weeks.map((week) => week.count))
  const peakIndex = weeks.reduce((best, week, i) => (week.count > weeks[best].count ? i : best), 0)
  const lastIndex = weeks.length - 1

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-end gap-1 border-b"
        style={{ height: CHART_HEIGHT_PX + 16, borderColor: "var(--viz-grid)" }}
      >
        {weeks.map((week, i) => {
          const height = (week.count / max) * CHART_HEIGHT_PX
          const showLabel = week.count > 0 && (i === lastIndex || i === peakIndex)
          return (
            <div
              key={week.start.toISOString()}
              tabIndex={0}
              aria-label={`Week of ${format(week.start, "MMM d")}: ${week.count} completed`}
              {...bind({ value: `${week.count} completed`, label: `week of ${format(week.start, "MMM d")}` })}
              className="group flex h-full flex-1 flex-col items-center justify-end outline-none"
            >
              {showLabel && <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{week.count}</span>}
              <div
                className="w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring"
                style={{ height: Math.max(week.count ? 2 : 0, height), backgroundColor: "var(--viz-bar)" }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums" aria-hidden>
        <span>{format(weeks[0].start, "MMM d")}</span>
        <span>This week</span>
      </div>
      {element}
    </div>
  )
}
