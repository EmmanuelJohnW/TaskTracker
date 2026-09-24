"use client"

import { CheckIcon, PlusIcon, TagIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { ColorDot } from "@/components/task/task-meta"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MAX_NAME } from "@/lib/actions/schemas"
import { createTag, toggleTaskTag } from "@/lib/actions/tags"
import { tagColor } from "@/lib/tasks/tag-color"
import type { Tag, TaskWithRelations } from "@/lib/tasks/types"

export function TagPicker({ task }: { task: TaskWithRelations }) {
  const { tags, mutate } = useAppData()
  const [query, setQuery] = useState("")
  const attachedIds = new Set(task.tags.map((tag) => tag.id))
  const needle = query.trim().toLowerCase()
  const matches = tags.filter((tag) => tag.name.toLowerCase().includes(needle))
  const exactMatch = tags.some((tag) => tag.name.toLowerCase() === needle)

  const toggle = (tag: Tag, attached: boolean) =>
    void mutate(() => toggleTaskTag({ taskId: task.id, tagId: tag.id, attached }), {
      optimistic: { type: "tag-toggle", taskId: task.id, tag, attached },
      success: attached ? `Tagged "${tag.name}"` : `Removed "${tag.name}"`,
    })

  const create = () => {
    const name = query.trim()
    if (!name || exactMatch) return
    const tag: Tag = { id: crypto.randomUUID(), user_id: task.user_id, name, color: tagColor(name) }
    setQuery("")
    void mutate(() => createTag({ id: tag.id, name, color: tag.color ?? undefined, taskId: task.id }), {
      optimistic: { type: "tag-toggle", taskId: task.id, tag, attached: true },
      success: `Created tag "${name}"`,
    })
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Tags</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {task.tags.map((tag) => (
          <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 text-xs">
            <ColorDot color={tag.color} />
            {tag.name}
            <button
              type="button"
              aria-label={`Remove tag ${tag.name}`}
              onClick={() => toggle(tag, false)}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="xs" />}>
            <TagIcon /> Add tag
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 gap-1 p-1.5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  create()
                }
              }}
              maxLength={MAX_NAME}
              placeholder="Find or create a tag"
              aria-label="Find or create a tag"
              autoFocus
              className="h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            />
            <ul className="max-h-52 overflow-y-auto" role="listbox" aria-label="Tags">
              {matches.map((tag) => {
                const attached = attachedIds.has(tag.id)
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={attached}
                      onClick={() => toggle(tag, !attached)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <ColorDot color={tag.color} />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {attached && <CheckIcon className="size-3.5" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            {needle && !exactMatch && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <PlusIcon className="size-3.5" /> Create “{query.trim()}”
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
