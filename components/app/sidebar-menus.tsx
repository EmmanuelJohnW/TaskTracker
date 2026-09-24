"use client"

import { ArchiveIcon, ArchiveRestoreIcon, MoreHorizontalIcon, PaletteIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { ColorSwatches, PALETTE } from "@/components/app/color-swatches"
import { NameColorDialog } from "@/components/app/name-color-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createProject, updateProject, updateWorkspace } from "@/lib/actions/workspaces"
import type { Project, Workspace } from "@/lib/tasks/types"

function MenuTrigger({ label }: { label: string }) {
  return (
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className="opacity-100 lg:opacity-0 lg:group-hover/ws:opacity-100 lg:group-hover/project:opacity-100 lg:focus-visible:opacity-100 lg:aria-expanded:opacity-100"
        />
      }
    >
      <MoreHorizontalIcon />
    </DropdownMenuTrigger>
  )
}

function ColorSubmenu({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <PaletteIcon /> Colour
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-auto p-2">
        <ColorSwatches value={value} onChange={onChange} className="w-40" />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export function WorkspaceMenu({ workspace }: { workspace: Workspace }) {
  const { mutate } = useAppData()
  const [dialog, setDialog] = useState<"rename" | "new-project" | null>(null)

  return (
    <>
      <DropdownMenu>
        <MenuTrigger label={`${workspace.name} options`} />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setDialog("new-project")}>
            <PlusIcon /> New project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <ColorSubmenu
            value={workspace.color}
            onChange={(color) =>
              void mutate(() => updateWorkspace({ id: workspace.id, patch: { color } }), {
                success: "Colour updated",
              })
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <NameColorDialog
        open={dialog === "rename"}
        onOpenChange={(open) => setDialog(open ? "rename" : null)}
        title="Rename workspace"
        submitLabel="Save"
        initialName={workspace.name}
        initialColor={workspace.color}
        onSubmit={async (patch) =>
          (await mutate(() => updateWorkspace({ id: workspace.id, patch }), { success: "Workspace updated" }))
            .success
        }
      />
      <NameColorDialog
        open={dialog === "new-project"}
        onOpenChange={(open) => setDialog(open ? "new-project" : null)}
        title={`New project in ${workspace.name}`}
        submitLabel="Create"
        initialColor={PALETTE[6]}
        onSubmit={async (values) =>
          (
            await mutate(() => createProject({ workspaceId: workspace.id, ...values }), {
              success: "Project created",
            })
          ).success
        }
      />
    </>
  )
}

export function ProjectMenu({ project }: { project: Project }) {
  const { mutate } = useAppData()
  const [renaming, setRenaming] = useState(false)
  const color = project.color ?? PALETTE[9]

  return (
    <>
      <DropdownMenu>
        <MenuTrigger label={`${project.name} options`} />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <ColorSubmenu
            value={color}
            onChange={(next) =>
              void mutate(() => updateProject({ id: project.id, patch: { color: next } }), {
                success: "Colour updated",
              })
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              void mutate(
                () => updateProject({ id: project.id, patch: { archived: !project.archived } }),
                { success: project.archived ? "Project restored" : "Project archived" }
              )
            }
          >
            {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {project.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NameColorDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Edit project"
        submitLabel="Save"
        initialName={project.name}
        initialColor={color}
        onSubmit={async (patch) =>
          (await mutate(() => updateProject({ id: project.id, patch }), { success: "Project updated" })).success
        }
      />
    </>
  )
}
