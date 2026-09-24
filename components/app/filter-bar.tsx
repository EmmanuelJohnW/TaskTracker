"use client"

import { cn } from "cn"
import { SearchIcon, TagIcon, XIcon, SignalIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { ColorDot, PriorityIndicator } from "@/components/task/task-meta"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NativeSelect } from "@/components/ui/native-select"
import { useFilters } from "@/hooks/use-filters"
import { DUE_FILTERS, DUE_FILTER_LABELS, EMPTY_FILTERS, hasActiveFilters, type DueFilter } from "@/lib/tasks/filters"
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/tasks/types"

export const SEARCH_INPUT_ID = "task-search"
const SEARCH_DEBOUNCE_MS = 250

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item]
}

export function FilterBar() {
  const { projects, workspaces, tags } = useAppData()
  const { filters, setFilters } = useFilters()

  const visibleWorkspaces = filters.workspaceId
    ? workspaces.filter((workspace) => workspace.id === filters.workspaceId)
    : workspaces

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput value={filters.query} onChange={(query) => setFilters({ query })} />

      <NativeSelect
        aria-label="Project"
        value={filters.projectId ?? ""}
        onChange={(event) => setFilters({ projectId: event.target.value || null })}
        className="w-40"
      >
        <option value="">All projects</option>
        {visibleWorkspaces.map((workspace) => (
          <optgroup key={workspace.id} label={workspace.name}>
            {projects
              .filter((project) => project.workspace_id === workspace.id && !project.archived)
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </optgroup>
        ))}
      </NativeSelect>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className={cn(filters.priorities.length && "border-primary/60")} />}
        >
          <SignalIcon /> Priority
          {filters.priorities.length > 0 && <CountBadge count={filters.priorities.length} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          {[...PRIORITIES].reverse().map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onCheckedChange={() => setFilters({ priorities: toggle(filters.priorities, priority) })}
            >
              <PriorityIndicator priority={priority} />
              {PRIORITY_LABELS[priority]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className={cn(filters.tagIds.length && "border-primary/60")} />}
        >
          <TagIcon /> Tags
          {filters.tagIds.length > 0 && <CountBadge count={filters.tagIds.length} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 w-48">
          {tags.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No tags yet</p>}
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={filters.tagIds.includes(tag.id)}
              onCheckedChange={() => setFilters({ tagIds: toggle(filters.tagIds, tag.id) })}
            >
              <ColorDot color={tag.color} />
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <NativeSelect
        aria-label="Due date"
        value={filters.due ?? ""}
        onChange={(event) => setFilters({ due: (event.target.value || null) as DueFilter | null })}
        className="w-36"
      >
        <option value="">Any due date</option>
        {DUE_FILTERS.map((due) => (
          <option key={due} value={due}>
            {DUE_FILTER_LABELS[due]}
          </option>
        ))}
      </NativeSelect>

      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ ...EMPTY_FILTERS, workspaceId: filters.workspaceId })}
        >
          <XIcon /> Clear
        </Button>
      )}
    </div>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">{count}</span>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Adopt URL changes made elsewhere (back button, "Clear") but never while the
  // user is typing, so a slow URL echo can't overwrite newer keystrokes.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(value)
  }, [value])

  useEffect(() => () => clearTimeout(timer.current), [])

  const update = (next: string) => {
    setDraft(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next), SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="relative w-full sm:w-56">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        id={SEARCH_INPUT_ID}
        type="search"
        value={draft}
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur()
        }}
        placeholder="Search tasks"
        aria-label="Search tasks"
        className="h-8 w-full rounded-lg border border-input bg-transparent pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      {!draft && (
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1 font-mono text-[10px] text-muted-foreground sm:block">
          /
        </kbd>
      )}
    </div>
  )
}
