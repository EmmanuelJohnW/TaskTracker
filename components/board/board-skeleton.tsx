import { Skeleton } from "@/components/ui/skeleton"
import { STATUSES } from "@/lib/tasks/types"

const CARDS_PER_COLUMN = [3, 2, 2, 1, 2]

export function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Loading board">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {STATUSES.map((status, i) => (
          <div key={status} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-3 lg:flex-1">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: CARDS_PER_COLUMN[i] }, (_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
