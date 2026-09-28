/** Every selectable theme. Palettes live in app/globals.css under [data-theme=…]. */
export const THEMES = [
  { id: "dark", label: "Dark", isDark: true, swatch: { surface: "#0a0a0a", accent: "#818cf8" } },
  { id: "light", label: "Light", isDark: false, swatch: { surface: "#ffffff", accent: "#4f46e5" } },
  { id: "green", label: "Green", isDark: false, swatch: { surface: "#ffffff", accent: "#15803d" } },
  { id: "brown", label: "Brown", isDark: false, swatch: { surface: "#ffffff", accent: "#8b5e3c" } },
  { id: "pink", label: "Pastel pink", isDark: false, swatch: { surface: "#ffffff", accent: "#f9a8c9" } },
] as const

export type ThemeId = (typeof THEMES)[number]["id"]

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id)
export const DEFAULT_THEME: ThemeId = "dark"

export function isDarkTheme(theme: string | undefined): boolean {
  return THEMES.some((option) => option.id === theme && option.isDark)
}
