"use client"

import { cn } from "cn"
import { useState } from "react"

import { Markdown } from "@/components/task/markdown"
import { Textarea } from "@/components/ui/textarea"
import { MAX_DESCRIPTION } from "@/lib/actions/schemas"

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
}

export function DescriptionField({ value, onChange }: DescriptionFieldProps) {
  const [mode, setMode] = useState<"write" | "preview">(value ? "preview" : "write")

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <div className="flex gap-0.5 rounded-md bg-muted p-0.5 text-[11px]" role="tablist">
          {(["write", "preview"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => setMode(option)}
              className={cn(
                "rounded px-2 py-0.5 capitalize text-muted-foreground",
                mode === option && "bg-background text-foreground shadow-xs dark:bg-input/40"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {mode === "write" ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Notes, links, checklists… Markdown supported."
          maxLength={MAX_DESCRIPTION}
          className="min-h-32 font-mono text-[13px]"
        />
      ) : (
        <div
          className="min-h-16 cursor-text rounded-lg border px-3 py-2"
          onClick={() => setMode("write")}
          role="button"
          tabIndex={0}
          aria-label="Edit description"
          onKeyDown={(event) => {
            if (event.key === "Enter") setMode("write")
          }}
        >
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">No description. Click to add one.</p>
          )}
        </div>
      )}
    </div>
  )
}
