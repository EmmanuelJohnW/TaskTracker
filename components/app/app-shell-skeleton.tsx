import { BoardSkeleton } from "@/components/board/board-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function AppShellSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden" aria-busy="true">
      <aside className="hidden w-60 shrink-0 space-y-2 border-r bg-sidebar p-3 lg:block">
        <Skeleton className="mb-4 h-6 w-24" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="space-y-3 border-b px-4 py-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-8 w-full max-w-2xl" />
        </div>
        <div className="flex flex-1 p-4">
          <BoardSkeleton />
        </div>
      </div>
    </div>
  )
}
