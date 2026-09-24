import { FilterXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function EmptyFiltered({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={<FilterXIcon className="size-5" />}
      title="No tasks match these filters"
      action={
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  )
}
