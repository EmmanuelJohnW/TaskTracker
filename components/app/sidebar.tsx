"use client"

import { cn } from "cn"
import { ArchiveIcon, LayersIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { NameColorDialog } from "@/components/app/name-color-dialog"
import { ProjectMenu, WorkspaceMenu } from "@/components/app/sidebar-menus"
import { ColorDot } from "@/components/task/task-meta"
import { Button } from "@/components/ui/button"
import { createWorkspace } from "@/lib/actions/workspaces"
import { parseFilters, writeFilters } from "@/lib/tasks/filters"
import type { Project, Workspace } from "@/lib/tasks/types"

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { workspaces, projects, tasks, mutate } = useAppData()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)

  const hrefFor = (workspaceId: string | null, projectId: string | null) => {
    const query = writeFilters(searchParams, { workspaceId, projectId }).toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const openCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasks) {
      if (task.status === "done") continue
      counts.set(task.workspace_id, (counts.get(task.workspace_id) ?? 0) + 1)
      if (task.project_id) counts.set(task.project_id, (counts.get(task.project_id) ?? 0) + 1)
    }
    return counts
  }, [tasks])
  const totalOpen = tasks.filter((task) => task.status !== "done").length

  return (
    <nav aria-label="Workspaces" className="flex h-full flex-col gap-1 overflow-y-auto p-2 text-sm">
      <NavItem
        href={hrefFor(null, null)}
        active={!filters.workspaceId}
        onNavigate={onNavigate}
        icon={<LayersIcon className="size-3.5" />}
        label="All"
        count={totalOpen}
      />
      {workspaces.map((workspace) => (
        <WorkspaceSection
          key={workspace.id}
          workspace={workspace}
          projects={projects.filter((project) => project.workspace_id === workspace.id)}
          activeWorkspaceId={filters.workspaceId}
          activeProjectId={filters.projectId}
          openCounts={openCounts}
          hrefFor={hrefFor}
          onNavigate={onNavigate}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 justify-start text-muted-foreground"
        onClick={() => setCreatingWorkspace(true)}
      >
        <PlusIcon /> New workspace
      </Button>
      <NameColorDialog
        open={creatingWorkspace}
        onOpenChange={setCreatingWorkspace}
        title="New workspace"
        submitLabel="Create"
        onSubmit={async (values) =>
          (await mutate(() => createWorkspace(values), { success: "Workspace created" })).success
        }
      />
    </nav>
  )
}

interface WorkspaceSectionProps {
  workspace: Workspace
  projects: Project[]
  activeWorkspaceId: string | null
  activeProjectId: string | null
  openCounts: Map<string, number>
  hrefFor: (workspaceId: string | null, projectId: string | null) => string
  onNavigate?: () => void
}

function WorkspaceSection({
  workspace,
  projects,
  activeWorkspaceId,
  activeProjectId,
  openCounts,
  hrefFor,
  onNavigate,
}: WorkspaceSectionProps) {
  const [showArchived, setShowArchived] = useState(false)
  const active = projects.filter((project) => !project.archived)
  const archived = projects.filter((project) => project.archived)
  const isActiveWorkspace = activeWorkspaceId === workspace.id

  return (
    <div className="mt-2">
      <div className="group/ws flex items-center">
        <NavItem
          href={hrefFor(workspace.id, null)}
          active={isActiveWorkspace && !activeProjectId}
          onNavigate={onNavigate}
          icon={<ColorDot color={workspace.color} className="size-2.5 rounded-sm" />}
          label={workspace.name}
          count={openCounts.get(workspace.id)}
          className="flex-1 font-medium"
        />
        <WorkspaceMenu workspace={workspace} />
      </div>
      <ul className="ml-3 border-l pl-1.5">
        {active.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            href={hrefFor(workspace.id, project.id)}
            active={activeProjectId === project.id}
            count={openCounts.get(project.id)}
            onNavigate={onNavigate}
          />
        ))}
        {archived.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArchiveIcon className="size-3" />
              {showArchived ? "Hide archived" : `Archived (${archived.length})`}
            </button>
          </li>
        )}
        {showArchived &&
          archived.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              href={hrefFor(workspace.id, project.id)}
              active={activeProjectId === project.id}
              onNavigate={onNavigate}
            />
          ))}
      </ul>
    </div>
  )
}

function ProjectRow({
  project,
  href,
  active,
  count,
  onNavigate,
}: {
  project: Project
  href: string
  active: boolean
  count?: number
  onNavigate?: () => void
}) {
  return (
    <li className="group/project flex items-center">
      <NavItem
        href={href}
        active={active}
        onNavigate={onNavigate}
        icon={<ColorDot color={project.color} />}
        label={project.name}
        count={count}
        className={cn("flex-1", project.archived && "text-muted-foreground italic")}
      />
      <ProjectMenu project={project} />
    </li>
  )
}

interface NavItemProps {
  href: string
  active: boolean
  icon: React.ReactNode
  label: string
  count?: number
  className?: string
  onNavigate?: () => void
}

function NavItem({ href, active, icon, label, count, className, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-muted",
        active && "bg-muted font-medium text-foreground",
        className
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count ? <span className="text-xs tabular-nums text-muted-foreground">{count}</span> : null}
    </Link>
  )
}
