"use client"

import { format } from "date-fns"
import { cn } from "cn"

import { useChartTooltip } from "@/components/stats/chart-tooltip"
import { useEffect, useRef } from "react"

import { heatLevel, monthLabels, type HeatmapDay } from "@/lib/tasks/completion-stats"

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""]
const LEVEL_VARS = ["--viz-heat-0", "--viz-heat-1", "--viz-heat-2", "--viz-heat-3", "--viz-heat-4"]

interface ActivityHeatmapProps {
  days: HeatmapDay[]
  /** Day keys that belong to the current streak; outlined in the grid. */
  streakKeys: Set<string>
}

export function ActivityHeatmap({ days, streakKeys }: ActivityHeatmapProps) {
  const { containerRef, bind, element } = useChartTooltip()
  const max = Math.max(0, ...days.map((day) => day.count))
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7))
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const months = monthLabels(days)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // On narrow screens start at the most recent weeks, like the calendar's "today".
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div ref={scrollerRef} className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`${total} tasks completed over the last ${weeks.length} weeks`}
          className="inline-grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "auto repeat(7, 12px)", gridTemplateColumns: `24px repeat(${weeks.length}, 12px)` }}
        >
          <span aria-hidden />
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} aria-hidden className="pr-1 text-[10px] leading-3 text-muted-foreground">
              {label}
            </span>
          ))}
          {weeks.map((week, i) => {
            return [
              <span key={`m${week[0].key}`} aria-hidden className="h-4 text-[10px] whitespace-nowrap text-muted-foreground">
                {months[i]}
              </span>,
              ...week.map((day) =>
                day.isFuture ? (
                  <span key={day.key} aria-hidden />
                ) : (
                  <span
                    key={day.key}
                    {...bind({
                      value: day.count === 1 ? "1 task" : `${day.count} tasks`,
                      label: format(day.date, "EEE, MMM d"),
                    })}
                    className={cn(
                      "size-3 rounded-[3px] transition-transform hover:scale-125",
                      streakKeys.has(day.key) && "ring-1 ring-foreground/60 ring-offset-1 ring-offset-card"
                    )}
                    style={{ backgroundColor: `var(${LEVEL_VARS[heatLevel(day.count, max)]})` }}
                  />
                )
              ),
            ]
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground" aria-hidden>
        Less
        {LEVEL_VARS.map((variable) => (
          <span key={variable} className="size-2.5 rounded-[2px]" style={{ backgroundColor: `var(${variable})` }} />
        ))}
        More
        <span className="ml-3 inline-block size-2.5 rounded-[2px] ring-1 ring-foreground/60" />
        Current streak
      </div>
      {element}
    </div>
  )
}
