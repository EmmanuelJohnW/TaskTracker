"use client"

import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { SEARCH_INPUT_ID } from "@/components/app/filter-bar"
import { Header } from "@/components/app/header"
import { Sidebar } from "@/components/app/sidebar"
import { TaskEditorSheet } from "@/components/task/task-editor-sheet"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { parseFilters } from "@/lib/tasks/filters"

interface AppShellProps {
  email: string | null
  children: React.ReactNode
}

export function AppShell({ email, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { openNew } = useTaskEditor()
  const searchParams = useSearchParams()

  const shortcuts = useMemo(
    () => ({
      n: () => {
        const filters = parseFilters(searchParams)
        openNew({ workspaceId: filters.workspaceId, projectId: filters.projectId })
      },
      "/": () => document.getElementById(SEARCH_INPUT_ID)?.focus(),
    }),
    [openNew, searchParams]
  )
  useKeyboardShortcuts(shortcuts)

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">
        <SidebarBrand />
        <Sidebar />
      </aside>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="gap-0 bg-sidebar p-0 data-[side=left]:w-72 data-[side=left]:max-w-[85vw]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={email} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{children}</main>
      </div>
      <TaskEditorSheet />
    </div>
  )
}

function SidebarBrand() {
  return (
    <div className="flex h-12 items-center gap-2 border-b px-4 text-sm font-semibold">
      <span className="size-5 rounded-md bg-primary" aria-hidden />
      Tracker
    </div>
  )
}
