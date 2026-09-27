"use client"

import { ColorDot } from "@/components/task/task-meta"
import type { Breakdown } from "@/lib/tasks/completion-stats"

interface BreakdownBarsProps {
  title: string
  rows: Breakdown[]
  /** Show the entity's own colour as a key beside its name. */
  showKeys?: boolean
}

/** Horizontal magnitude bars in one hue; the value sits at the bar's tip. */
export function BreakdownBars({ title, rows, showKeys = true }: BreakdownBarsProps) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing completed yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                {showKeys && <ColorDot color={row.color} />}
                <span className="truncate" title={row.label}>
                  {row.label}
                </span>
              </span>
              <span className="flex items-center gap-2" title={`${row.label}: ${row.count} completed`}>
                <span
                  className="h-2 rounded-r-[4px]"
                  style={{ width: `${(row.count / max) * 85}%`, minWidth: row.count ? 4 : 0, backgroundColor: "var(--viz-bar)" }}
                />
                <span className="tabular-nums text-foreground">{row.count}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
