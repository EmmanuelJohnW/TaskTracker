"use client"

import { cn } from "cn"
import { CalendarDaysIcon, KanbanSquareIcon, ListIcon, LogOutIcon, MenuIcon, PlusIcon, UserIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { useAppData } from "@/components/app/app-data-provider"
import { FilterBar } from "@/components/app/filter-bar"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/actions/auth"
import { parseFilters } from "@/lib/tasks/filters"

const VIEWS = [
  { href: "/board", label: "Board", icon: KanbanSquareIcon },
  { href: "/list", label: "List", icon: ListIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
] as const

interface HeaderProps {
  email: string | null
  onOpenSidebar: () => void
}

export function Header({ email, onOpenSidebar }: HeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { workspaces, projects } = useAppData()
  const { openNew } = useTaskEditor()
  const filters = parseFilters(searchParams)
  const query = searchParams.toString()

  const workspace = workspaces.find((item) => item.id === filters.workspaceId)
  const project = projects.find((item) => item.id === filters.projectId)
  const heading = project?.name ?? workspace?.name ?? "All tasks"

  return (
    <header className="space-y-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open sidebar" onClick={onOpenSidebar}>
          <MenuIcon />
        </Button>
        <h1 className="min-w-0 truncate text-base font-semibold">{heading}</h1>

        <nav aria-label="Views" className="ml-2 flex rounded-lg bg-muted p-0.5">
          {VIEWS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={query ? `${href}?${query}` : href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-background text-foreground shadow-xs dark:bg-input/40"
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            onClick={() => openNew({ workspaceId: filters.workspaceId, projectId: filters.projectId })}
          >
            <PlusIcon />
            <span className="hidden sm:inline">New task</span>
            <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1 font-mono text-[10px] sm:inline">N</kbd>
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Account" />}>
              <UserIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate">{email ?? "Signed in"}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Shortcuts</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                  New task <DropdownMenuShortcut>N</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Search <DropdownMenuShortcut>/</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Close editor <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOutIcon /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <FilterBar />
    </header>
  )
}
