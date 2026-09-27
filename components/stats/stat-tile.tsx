interface StatTileProps {
  label: string
  value: string
  icon: React.ReactNode
  detail?: string
}

export function StatTile({ label, value, icon, detail }: StatTileProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-semibold">{value}</span>
      {detail && <span className="text-[11px] text-muted-foreground">{detail}</span>}
    </div>
  )
}
