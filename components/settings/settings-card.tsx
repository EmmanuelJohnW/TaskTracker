import { cn } from "cn"

interface SettingsCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ title, description, icon, children, className }: SettingsCardProps) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-start gap-3 border-b px-4 py-3">
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  )
}
