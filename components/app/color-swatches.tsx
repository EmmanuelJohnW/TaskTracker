"use client"

import { CheckIcon } from "lucide-react"
import { cn } from "cn"

export const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
] as const

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorSwatches({ value, onChange, className }: ColorSwatchesProps) {
  return (
    <div role="radiogroup" aria-label="Colour" className={cn("flex flex-wrap gap-1.5", className)}>
      {PALETTE.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: color }}
          >
            {selected && <CheckIcon className="size-3.5 text-white" />}
          </button>
        )
      })}
    </div>
  )
}
