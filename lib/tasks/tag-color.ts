const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#8b5cf6", "#ec4899"]

/** Stable colour per tag name, so client previews match what the server stores. */
export function tagColor(name: string): string {
  const hash = [...name.toLowerCase()].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return TAG_COLORS[hash % TAG_COLORS.length]
}
