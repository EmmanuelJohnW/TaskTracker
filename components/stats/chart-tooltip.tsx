"use client"

import { useCallback, useRef, useState } from "react"

export interface TooltipContent {
  value: string
  label: string
}

interface TooltipState extends TooltipContent {
  x: number
  y: number
}

/**
 * One tooltip per chart, anchored above the hovered or focused mark. Content
 * is rendered as text nodes, so labels from user data can't inject markup.
 */
export function useChartTooltip() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const show = useCallback((target: Element, content: TooltipContent) => {
    const container = containerRef.current
    if (!container) return
    const box = container.getBoundingClientRect()
    const mark = target.getBoundingClientRect()
    setTooltip({ ...content, x: mark.left - box.left + mark.width / 2, y: mark.top - box.top })
  }, [])

  const hide = useCallback(() => setTooltip(null), [])

  /** Spread onto a mark to wire hover and keyboard focus. */
  const bind = useCallback(
    (content: TooltipContent) => ({
      onPointerEnter: (event: React.PointerEvent) => show(event.currentTarget, content),
      onPointerLeave: hide,
      onFocus: (event: React.FocusEvent) => show(event.currentTarget, content),
      onBlur: hide,
    }),
    [show, hide]
  )

  const element = tooltip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
      style={{ left: tooltip.x, top: tooltip.y - 6 }}
    >
      <span className="font-semibold">{tooltip.value}</span>
      <span className="ml-1.5 text-muted-foreground">{tooltip.label}</span>
    </div>
  ) : null

  return { containerRef, bind, element }
}
